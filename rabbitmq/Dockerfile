FROM rabbitmq:4.1.3-management

RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    rm -rf /var/lib/apt/lists/*

COPY custom-entrypoint.sh /usr/local/bin/
COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY definitions.template.json /etc/rabbitmq/definitions.template.json

RUN chmod +x /usr/local/bin/custom-entrypoint.sh
ENTRYPOINT ["custom-entrypoint.sh"]
CMD ["rabbitmq-server"]