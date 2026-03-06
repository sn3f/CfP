import os
import sys
import json
import traceback
import pika
import time
import logging
import functools
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import local modules
from .openRouterClassifier import OpenRouterClassifier
from .regionData import COUNTRY_REGION_MAP

class Classifier:
    def __init__(self):
        # RabbitMQ configuration
        self.rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
        self.rabbitmq_user = os.getenv('RABBITMQ_DEFAULT_USER', 'user')
        self.rabbitmq_pass = os.getenv('RABBITMQ_DEFAULT_PASS', 'password')
        self.rabbitmq_heartbeat = int(os.getenv('RABBITMQ_HEARTBEAT', 600))
        self.rabbitmq_blocked_timeout = int(os.getenv("RABBITMQ_BLOCKED_CONNECTION_TIMEOUT_SECONDS", 300))
        self.rabbitmq_socket_timeout = int(os.getenv("RABBITMQ_SOCKET_TIMEOUT_SECONDS", 60))
        self.exchange = os.getenv('MQ_EXCHANGE', 'classification_result_exchange')
        self.dlq_exchange = os.getenv('CFP_DLQ_EXCHANGE', 'dlq_classification_result_exchange')
        self.dlq_routing_key = os.getenv('CFP_DLQ_ROUTING_KEY', 'dlq_classification_result_routing_key')
        self.retry_delay = int(os.getenv('CLASSIFIER_RETRY_DELAY_SECONDS', 60))
        self.request_delay = int(os.getenv('CLASSIFIER_REQUEST_DELAY_SECONDS', 2))
        self.input_queue = 'classification_target_queue'
        self.output_queue = 'classification_result_queue'
        self.output_routing_key = 'classification_result_routing_key'

        self.connection = None
        self.channel = None

        self.executor = ThreadPoolExecutor(max_workers=1)
        self.country_region_map = COUNTRY_REGION_MAP

        try:
            self.classifier = OpenRouterClassifier()
            logger.info("Classifier component initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize classifier: {e}")
            sys.exit(1)

    def connect_to_rabbitmq(self, retries=5, delay=5):
        credentials = pika.PlainCredentials(self.rabbitmq_user, self.rabbitmq_pass)
        parameters = pika.ConnectionParameters(
            host=self.rabbitmq_host,
            credentials=credentials,
            heartbeat=self.rabbitmq_heartbeat,
            blocked_connection_timeout=self.rabbitmq_blocked_timeout,
            socket_timeout=self.rabbitmq_socket_timeout,
            connection_attempts=3,
            retry_delay=2,
        )

        for i in range(retries):
            try:
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                self.channel.exchange_declare(exchange=self.exchange, exchange_type='direct', durable=True)

                # Declare input queue
                self.channel.queue_declare(queue=self.input_queue, durable=True)
                self.channel.queue_bind(exchange=self.exchange, queue=self.input_queue, routing_key='html_content')

                # Declare output queue
                queue_args = {
                    "x-dead-letter-exchange": self.dlq_exchange,
                    "x-dead-letter-routing-key": self.dlq_routing_key
                }
                self.channel.queue_declare(queue=self.output_queue, durable=True, arguments=queue_args)

                self.channel.queue_bind(exchange=self.exchange, queue=self.output_queue, routing_key=self.output_routing_key)

                logger.info("Successfully connected to RabbitMQ")
                return True
            except pika.exceptions.AMQPConnectionError as e:
                logger.warning(f"RabbitMQ connection failed. Retrying in {delay}s... ({i+1}/{retries})")
                time.sleep(delay)
        return False

    def process_message(self, ch, method, properties, body):
        self.executor.submit(self._process_message_worker, ch, method, properties, body)

    def _process_message_worker(self, ch, method, properties, body):
        delivery_tag = method.delivery_tag
        try:
            html_data = json.loads(body)
            content = html_data.get('content', '')
            url = html_data.get('url', 'unknown')
            logger.info(f"Classifying message for URL: {url}")

            classification_result = self.classifier.classify_content(content)

            # Add regions based on the extracted country
            if self.country_region_map and classification_result and 'extracted_data' in classification_result:
                extracted_countries = classification_result['extracted_data'].get('country')

                if isinstance(extracted_countries, list):
                    found_regions = set()
                    for country_name in extracted_countries:
                        region = self.country_region_map.get(country_name.strip().lower())
                        if region:
                            found_regions.add(region)
                    classification_result['extracted_data']['regions'] = list(found_regions)
                else:
                    classification_result['extracted_data']['regions'] = []

            if not classification_result:
                logger.error(f"Classification failed for {url}. Will requeue after {self.retry_delay} seconds.")
                if self.retry_delay > 0:
                    time.sleep(self.retry_delay)
                self.connection.add_callback_threadsafe(
                    functools.partial(ch.basic_nack, delivery_tag=delivery_tag, requeue=True)
                )
                return

            logger.info(f"Classification result: {classification_result}")

            enriched_data = {
                "original_message": html_data,
                "classification_result": classification_result
            }

            def publish_then_ack():
                ch.basic_publish(
                    exchange=self.exchange,
                    routing_key=self.output_routing_key,
                    body=json.dumps(enriched_data),
                    properties=pika.BasicProperties(delivery_mode=2)
                )
                ch.basic_ack(delivery_tag=delivery_tag)

            if self.request_delay > 0:
                logger.info(f"Waiting for {self.request_delay} seconds before publishing the result.")
                time.sleep(self.request_delay)

            self.connection.add_callback_threadsafe(publish_then_ack)

        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
            self.connection.add_callback_threadsafe(
                functools.partial(ch.basic_nack, delivery_tag=delivery_tag, requeue=False)
            )

    def start_consuming(self):
        self.channel.basic_qos(prefetch_count=1)
        self.channel.basic_consume(queue=self.input_queue, on_message_callback=self.process_message)
        logger.info("Classifier worker started. Waiting for messages.")
        self.channel.start_consuming()

def main():
    worker = Classifier()
    while True:
        try:
            if worker.connect_to_rabbitmq():
                worker.start_consuming()
        except pika.exceptions.AMQPError as e:
            logger.warning(f"RabbitMQ connection lost: {e}. Reconnecting...")
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Shutting down classifier worker.")
            break
        except Exception as e:
            logger.critical(f"Unrecoverable error: {e}\n{traceback.format_exc()}")
            break

if __name__ == "__main__":
    main()