import os
import json
import logging
from typing import Dict, Any, Optional

from haystack_integrations.components.generators.openrouter import OpenRouterChatGenerator
from haystack import Pipeline
from .baseClassifier import BaseClassifier

logger = logging.getLogger(__name__)

class OpenRouterClassifier(BaseClassifier):
    def __init__(self):
        super().__init__()

        self.api_key = os.getenv('OPENROUTER_API_KEY')
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")

        # Fetch criteria
        self.criteria = self.fetch_criteria()
        if not self.criteria:
            raise RuntimeError("Could not fetch classification criteria.")
        # ILO Eligibility criteria is done in a separate prompt, we can ignore it here
        self.criteria = [c for c in self.criteria if c['fieldName'] != "ILO Eligibility"]

        # Token limit configuration
        self.max_context_tokens = int(os.getenv('CLASSIFIER_MAX_CONTEXT_TOKENS', 180000))

        # Set up OpenRouter
        self.llm = OpenRouterChatGenerator(
            model=os.getenv('CLASSIFIER_MODEL', 'deepseek/deepseek-chat-v3.1:free')
        )

        self.prompt_builder = self.setup_prompt_builder(self.criteria, rag_mode=False)

        # Create pipeline
        self.pipeline = Pipeline()
        self.pipeline.add_component("prompt_builder", self.prompt_builder)
        self.pipeline.add_component("llm", self.llm)
        self.pipeline.connect("prompt_builder.prompt", "llm.messages")


        self.ilo_eligibility_pipeline = self.create_ilo_eligibility_pipeline()

        self.ilo_match_pipeline = self.create_ilo_match_pipeline()

        self._rag_classifier = None

        logger.info(f"OpenRouter classifier initialized with max context: {self.max_context_tokens} tokens")

    def _get_rag_classifier(self):
        """Lazy initialization of RAG classifier"""
        if self._rag_classifier is None:
            from .ragClassifier import RAGClassifier
            self._rag_classifier = RAGClassifier(self.criteria, self.max_context_tokens)
            logger.info("RAG classifier initialized")
        return self._rag_classifier

    def classify_content(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Classify content using OpenRouter. Automatically switches to RAG if content is too large.

        Args:
            content: HTML or text content to classify

        Returns:
            Classification result dictionary or None if error
        """
        response_text = ""
        try:
            # Step 1: Estimate token count for the content
            content_tokens = self.estimate_tokens(content)
            logger.info(f"Estimated content tokens: {content_tokens:,}")

            # Step 2: Check if we need to use RAG approach
            if content_tokens > self.max_context_tokens:
                logger.warning(f"Content size ({content_tokens:,} tokens) exceeds limit ({self.max_context_tokens:,} tokens)")
                logger.info("Switching to RAG-based classification")

                rag_classifier = self._get_rag_classifier()
                return rag_classifier.classify_content(content)

            # Step 3: Use standard full-context classification
            logger.info(f"Using full-context classification (within {self.max_context_tokens:,} token limit)")

            result = self.pipeline.run({
                "prompt_builder": {"content": content}
            })

            main_response = self.parse_json_from_reply(result["llm"]["replies"][0].text)

            # ILO Eligibility check
            ilo_eligibility_result = self.ilo_eligibility_pipeline.run(
                {"prompt_builder": {"content": content}}
            )
            ilo_eligibility_response = self.parse_json_from_reply(ilo_eligibility_result["llm"]["replies"][0].text)
            classification_result = self.merge_results(main_response, ilo_eligibility_response)

            # ILO Match check
            ilo_match_result = self.ilo_match_pipeline.run(
                # classification only
                {"prompt_builder": {"content": classification_result}}
            )
            ilo_match_response = self.parse_json_from_reply(ilo_match_result["llm"]["replies"][0].text)
            classification_result["extracted_data"]["match"] = ilo_match_response

            logger.info("Content classification completed successfully")

            return classification_result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Raw response from API: {response_text}")
            return None
        except Exception as e:
            logger.error(f"Error during classification: {e}", exc_info=True)
            return None