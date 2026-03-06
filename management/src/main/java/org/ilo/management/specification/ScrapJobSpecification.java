package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.AndNode;
import cz.jirutka.rsql.parser.ast.ComparisonNode;
import cz.jirutka.rsql.parser.ast.OrNode;
import cz.jirutka.rsql.parser.ast.RSQLVisitor;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import org.ilo.management.model.ScrapJob;
import org.springframework.data.jpa.domain.Specification;

public class ScrapJobSpecification extends BaseRSQLVisitor
    implements RSQLVisitor<Specification<ScrapJob>, Void> {

  @Override
  public Specification<ScrapJob> visit(AndNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::and)
        .orElse(null);
  }

  @Override
  public Specification<ScrapJob> visit(OrNode node, Void param) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, param))
        .reduce(Specification::or)
        .orElse(null);
  }

  @Override
  public Specification<ScrapJob> visit(ComparisonNode node, Void param) {
    return (root, query, builder) -> {
      Path<?> path = getPath(root, node.getSelector());
      return createPredicate(node, path, builder);
    };
  }

  private Path<?> getPath(Root<ScrapJob> root, String selector) {
    try {
      return root.get(selector);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Invalid field selector: " + selector, e);
    }
  }
}
