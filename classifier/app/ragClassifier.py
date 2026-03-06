import os
import logging
from typing import Dict, Any, Optional, List
from haystack import Pipeline, Document
from haystack.components.embedders import SentenceTransformersDocumentEmbedder, SentenceTransformersTextEmbedder
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.components.preprocessors import DocumentSplitter
from haystack_integrations.components.generators.openrouter import OpenRouterChatGenerator
from .baseClassifier import BaseClassifier
import json

logger = logging.getLogger(__name__)

class RAGClassifier(BaseClassifier):
    """RAG-based classifier for large documents that exceed token limits"""

    def __init__(self, criteria: List[Dict[str, Any]], max_context_tokens: int):
        super().__init__()

        self.criteria = criteria
        # ILO Eligibility criteria is done in a separate prompt, we can ignore it here
        self.criteria = [c for c in self.criteria if c['fieldName'] != "ILO Eligibility"]
        self.max_context_tokens = max_context_tokens

        # Initialize embedding model
        self.embedding_model = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')

        self.llm_model_name = os.getenv('CLASSIFIER_MODEL', 'deepseek/deepseek-chat-v3.1:free')

        logger.info(f"RAG classifier initialized with max context: {max_context_tokens} tokens")

    def classify_content(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Classify content using RAG approach for large documents

        Args:
            content: HTML or text content to classify

        Returns:
            Classification result dictionary or None if error
        """
        classification_result = ""
        try:
            logger.info("Using RAG approach for classification due to large content size")

            # Step 1: Create document store and index the content
            document_store = InMemoryDocumentStore()

            # Step 2: Split content into chunks
            # Using larger chunks since we want to maximize information retrieval
            splitter = DocumentSplitter(
                split_by="word",
                split_length=500,  # 500 words ≈ 650-750 tokens
                split_overlap=100   # Generous overlap to avoid losing context
            )

            docs = splitter.run(documents=[Document(content=content)])
            split_docs = docs["documents"]

            logger.info(f"Split content into {len(split_docs)} chunks")

            # Step 3: Embed and store documents
            doc_embedder = SentenceTransformersDocumentEmbedder(model=self.embedding_model)
            doc_embedder.warm_up()

            embedded_docs = doc_embedder.run(documents=split_docs)
            document_store.write_documents(embedded_docs["documents"])

            logger.info(f"Indexed {len(embedded_docs['documents'])} document chunks")

            # Step 4: Create retrieval query based on criteria
            query = self._create_retrieval_query()

            # Step 5: Retrieve relevant chunks
            text_embedder = SentenceTransformersTextEmbedder(model=self.embedding_model)
            text_embedder.warm_up()

            retriever = InMemoryEmbeddingRetriever(document_store=document_store)

            query_embedding = text_embedder.run(text=query)

            # Calculate how many chunks we can retrieve
            # Reserve tokens for prompt template, criteria, and output
            prompt_overhead = self._estimate_prompt_overhead()
            available_tokens = self.max_context_tokens - prompt_overhead

            retrieved_chunks = []
            current_tokens = 0

            # Retrieve up to 100 chunks
            initial_retrieval = min(len(split_docs), 100)
            results = retriever.run(
                query_embedding=query_embedding["embedding"],
                top_k=initial_retrieval
            )

            for doc in results["documents"]:
                chunk_tokens = self.estimate_tokens(doc.content)
                if current_tokens + chunk_tokens < available_tokens:
                    retrieved_chunks.append(doc.content)
                    current_tokens += chunk_tokens
                else:
                    break

            logger.info(f"Retrieved {len(retrieved_chunks)} chunks totaling ~{current_tokens} tokens")

            # Step 6: Combine retrieved chunks
            combined_context = "\n\n---\n\n".join(retrieved_chunks)

            # Step 7: Build prompt and classify
            prompt_builder = self.setup_prompt_builder(self.criteria, rag_mode=True)

            llm = OpenRouterChatGenerator(model=self.llm_model_name)

            pipeline = Pipeline()
            pipeline.add_component("prompt_builder", prompt_builder)
            pipeline.add_component("llm", llm)  # Use the local 'llm', not 'self.llm'
            pipeline.connect("prompt_builder.prompt", "llm.messages")

            result = pipeline.run({
                "prompt_builder": {"content": combined_context}
            })
            reply = result["llm"]["replies"][0]
            response_text = reply.text

            start_index = response_text.find('{')
            end_index = response_text.rfind('}')

            if start_index == -1 or end_index == -1:
                logger.error(f"Could not find valid JSON in response")
                logger.error(f"Raw response: {response_text}")
                return None

            json_string = response_text[start_index : end_index + 1]
            main_response = json.loads(json_string)

            # Step 8: ILO Eligibility Check
            ilo_pipeline = self.create_ilo_eligibility_pipeline()
            ilo_result = ilo_pipeline.run({
                "prompt_builder": {"content": combined_context}
            })
            

            ilo_response = self.parse_json_from_reply(ilo_result["llm"]["replies"][0].text)

            classification_result = self.merge_results(main_response, ilo_response)

            # ILO Match check
            ilo_match_pipeline = self.create_ilo_match_pipeline()
            ilo_match_result = ilo_match_pipeline.run(
                {"prompt_builder": {"content": classification_result}}
            )
            ilo_match_response = self.parse_json_from_reply(ilo_match_result["llm"]["replies"][0].text)

            classification_result["extracted_data"]["match"] = ilo_match_response

            logger.info(f"RAG classification completed: eligible={classification_result.get('eligible')}")
            return classification_result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Raw response from API: {classification_result}")
            return None
        except Exception as e:
            logger.error(f"Error during RAG classification: {e}", exc_info=True)
            return None

    def _estimate_prompt_overhead(self) -> int:
        """Estimate tokens needed for prompt template, criteria, and system instructions"""
        # Create a sample prompt to estimate overhead
        prompt_builder = self.setup_prompt_builder(self.criteria, rag_mode=True)
        sample_prompt = prompt_builder.template[0].text

        # Replace template variable with empty string to get base size
        sample_prompt = sample_prompt.replace("{{ content }}", "")

        overhead = self.estimate_tokens(sample_prompt)

        # Add buffer for response (JSON output can be 2-3k tokens)
        overhead += 3000

        logger.info(f"Estimated prompt overhead: {overhead} tokens")
        return overhead

    def _create_retrieval_query(self) -> str:
        """Create a focused query to retrieve relevant chunks for classification"""
        query_parts = [
            "eligibility criteria",
            "organization types eligible",
            "grant funding amount",
            "deadline date",
            "geographic scope",
            "funding instruments",
            "application requirements",
            "co-financing match funding",
            "accreditation requirements",
            "consortium partnership rules",
            "procurement tender RFP"
        ]
        return " ".join(query_parts)