package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.*;
import jakarta.persistence.criteria.*;
import java.util.HashMap;
import java.util.Map;
import org.ilo.management.model.ScrapResult;
import org.springframework.data.jpa.domain.Specification;

public class ScrapResultSpecificationBuilder extends BaseRSQLVisitor
    implements RSQLVisitor<
        Specification<ScrapResult>, ScrapResultSpecificationBuilder.RSQLVisitorContext> {

  public Specification<ScrapResult> createSpecification(Node rootNode) {
    return rootNode.accept(this, new RSQLVisitorContext());
  }

  @Override
  public Specification<ScrapResult> visit(AndNode node, RSQLVisitorContext context) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, context))
        .reduce(Specification::and)
        .orElse(null);
  }

  @Override
  public Specification<ScrapResult> visit(OrNode node, RSQLVisitorContext context) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, context))
        .reduce(Specification::or)
        .orElse(null);
  }

  @Override
  public Specification<ScrapResult> visit(ComparisonNode node, RSQLVisitorContext context) {
    return (root, query, builder) -> {
      String selector = node.getSelector();
      Path<?> path = getPath(root, selector, context.getJoins());
      return createPredicate(node, path, builder);
    };
  }

  private Path<?> getPath(Path<?> path, String selector, Map<String, Join<?, ?>> joins) {
    if (!selector.contains(".")) {
      return path.get(selector);
    }

    String[] parts = selector.split("\\.", 2);
    String joinAlias = parts[0];
    String nextSelector = parts[1];

    String attributeName = joinAlias.replaceAll("\\d+$", "");

    Join<?, ?> join = computeJoin(path, joinAlias, attributeName, joins);
    return getPath(join, nextSelector, joins);
  }

  private Join<?, ?> computeJoin(
      Path<?> path, String joinAlias, String attributeName, Map<String, Join<?, ?>> joins) {
    Join<?, ?> join = joins.get(joinAlias);

    // TODO: This has to be investigated, there must be better solution
    //   The Specification is called twice, for read query and count query.
    //   The Join created for read query, cant be reused in count query.
    //   We check if the Join belongs to the same query as path, and create newone if it doesn't
    //   The Join cache in Context has been introduced in CfpAnalysisSpecificationBuilder
    //   to be able to correctly filter by multiple joined entities
    if (join == null || !areFromSameQuery(path, join)) {
      join = ((From<Object, Object>) path).join(attributeName, JoinType.INNER);
      joins.put(joinAlias, join);
    }

    return join;
  }

  public boolean areFromSameQuery(Path<?> path1, Path<?> path2) {
    Root<?> root1 = findRoot(path1);
    Root<?> root2 = findRoot(path2);

    return root1 != null && root1.equals(root2);
  }

  private Root<?> findRoot(Path<?> path) {
    Path<?> current = path;
    while (current != null && !(current instanceof Root)) {
      if (current instanceof Join) {
        current = ((Join<?, ?>) current).getParent();
      } else if (current.getParentPath() != null) {
        current = current.getParentPath();
      } else if (current instanceof From) {
        current = ((From<?, ?>) current).getCorrelationParent();
      } else {
        current = null;
      }
    }
    return (Root<?>) current;
  }

  public static class RSQLVisitorContext {
    private final Map<String, Join<?, ?>> joins = new HashMap<>();

    Map<String, Join<?, ?>> getJoins() {
      return joins;
    }
  }
}
