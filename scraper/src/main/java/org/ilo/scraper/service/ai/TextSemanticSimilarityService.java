package org.ilo.scraper.service.ai;

import ai.djl.inference.Predictor;
import ai.djl.repository.zoo.ZooModel;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

/**
 * Calculates the semantic similarity between two strings using vector embeddings.
 *
 * <p>This component uses all-MiniLM-L6-v2 to convert a query string and a target string into
 * numerical vector representations (embeddings). It then calculates the cosine similarity between
 * these two vectors to determine how semantically similar the texts are.
 *
 * <p>To optimize performance, it caches the vector embedding for the query text.
 */
@Component
public class TextSemanticSimilarityService {
  private final Cache<String, float[]> queryCache = Caffeine.newBuilder().maximumSize(1000).build();
  private final ZooModel<String, float[]> model;

  public TextSemanticSimilarityService(ZooModel<String, float[]> model) {
    this.model = model;
  }

  private float[] generateEmbedding(Predictor<String, float[]> predictor, String text) {
    try {
      return predictor.predict(text);
    } catch (Exception e) {
      throw new RuntimeException(
          String.format("Failed to generate embedding for text: %s", text), e);
    }
  }

  public double score(String queryText, String targetText) {
    try (Predictor<String, float[]> predictor = model.newPredictor()) {
      final float[] queryVector =
          queryCache.get(queryText, text -> generateEmbedding(predictor, text));
      final float[] targetVector = generateEmbedding(predictor, targetText);
      return calculateCosineSimilarity(queryVector, targetVector);
    }
  }

  private double calculateCosineSimilarity(float[] v1, float[] v2) {
    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;
    for (int i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
