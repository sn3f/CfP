package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.*;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import org.ilo.management.model.CriterionType;
import org.springframework.data.jpa.domain.Specification;

public class CriterionTypeSpecification extends BaseRSQLVisitor
    implements RSQLVisitor<Specification<CriterionType>, Void> {

  @Override
  public Specification<CriterionType> visit(AndNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::and)
        .orElse(null);
  }

  @Override
  public Specification<CriterionType> visit(OrNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::or)
        .orElse(null);
  }

  @Override
  public Specification<CriterionType> visit(ComparisonNode node, Void param) {
    return (root, query, builder) -> {
      Path<?> path = getPath(root, node.getSelector());
      return createPredicate(node, path, builder);
    };
  }

  private Path<?> getPath(Root<CriterionType> root, String selector) {
    try {
      return root.get(selector);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Invalid field selector: " + selector, e);
    }
  }
}
