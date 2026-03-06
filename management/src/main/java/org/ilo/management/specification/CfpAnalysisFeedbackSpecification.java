package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.AndNode;
import cz.jirutka.rsql.parser.ast.ComparisonNode;
import cz.jirutka.rsql.parser.ast.OrNode;
import cz.jirutka.rsql.parser.ast.RSQLVisitor;
import jakarta.persistence.criteria.*;
import org.ilo.management.model.*;
import org.springframework.data.jpa.domain.Specification;

public class CfpAnalysisFeedbackSpecification extends BaseRSQLVisitor
    implements RSQLVisitor<Specification<AnalysisFeedback>, Void> {

  @Override
  public Specification<AnalysisFeedback> visit(AndNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::and)
        .orElse(null);
  }

  @Override
  public Specification<AnalysisFeedback> visit(OrNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::or)
        .orElse(null);
  }

  @Override
  public Specification<AnalysisFeedback> visit(ComparisonNode node, Void param) {
    return (root, query, builder) -> {
      Path<?> path = getPath(root, node.getSelector());
      return createPredicate(node, path, builder);
    };
  }

  private Path<?> getPath(Root<AnalysisFeedback> root, String selector) {
    if (!selector.contains(".")) {
      return root.get(selector);
    }

    String[] parts = selector.split("\\.");
    return switch (parts[0]) {
      case "cfpAnalysis" -> {
        Join<AnalysisFeedback, Analysis> cfpAnalysisJoin = root.join("cfpAnalysis", JoinType.INNER);
        yield cfpAnalysisJoin.get(parts[1]);
      }
      case "createdBy" -> {
        Join<AnalysisFeedback, User> userJoin = root.join("createdBy", JoinType.INNER);
        yield userJoin.get(parts[1]);
      }
      case "items" -> {
        Join<AnalysisFeedback, CfpAnalysisFeedbackItem> itemsJoin =
            root.join("items", JoinType.INNER);
        yield itemsJoin.get(parts[1]);
      }
      default -> throw new IllegalArgumentException("Unsupported selector format: " + selector);
    };
  }
}
