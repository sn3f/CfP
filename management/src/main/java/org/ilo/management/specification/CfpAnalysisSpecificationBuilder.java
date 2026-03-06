package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.AndNode;
import cz.jirutka.rsql.parser.ast.ComparisonNode;
import cz.jirutka.rsql.parser.ast.Node;
import cz.jirutka.rsql.parser.ast.OrNode;
import cz.jirutka.rsql.parser.ast.RSQLVisitor;
import jakarta.persistence.criteria.*;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.ilo.management.model.Analysis;
import org.springframework.data.jpa.domain.Specification;

public class CfpAnalysisSpecificationBuilder extends BaseRSQLVisitor
    implements RSQLVisitor<
        Specification<Analysis>, CfpAnalysisSpecificationBuilder.RSQLVisitorContext> {

  private static final String JSON_PROPERTY_PREFIX = "extractedData.json.";

  public Specification<Analysis> createSpecification(Node rootNode) {
    return rootNode.accept(this, new RSQLVisitorContext());
  }

  @Override
  public Specification<Analysis> visit(AndNode node, RSQLVisitorContext context) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, context))
        .reduce(Specification::and)
        .orElse(null);
  }

  @Override
  public Specification<Analysis> visit(OrNode node, RSQLVisitorContext context) {
    return node.getChildren().stream()
        .map(n -> n.accept(this, context))
        .reduce(Specification::or)
        .orElse(null);
  }

  @Override
  public Specification<Analysis> visit(ComparisonNode node, RSQLVisitorContext context) {
    return (root, query, builder) -> {
      String selector = node.getSelector();
      if (selector.startsWith(JSON_PROPERTY_PREFIX)) {
        return createJsonPredicate(node, root, builder);
      } else {
        Path<?> path = getPath(root, selector, context.getJoins());
        return createPredicate(node, path, builder);
      }
    };
  }

  private Predicate createJsonPredicate(
      ComparisonNode node, Root<Analysis> root, CriteriaBuilder builder) {
    String jsonPropertyPath = node.getSelector().substring(JSON_PROPERTY_PREFIX.length());

    Expression<?> jsonValue =
        builder.function(
            "jsonb_extract_path_text",
            String.class,
            root.get("extractedData"),
            builder.literal(jsonPropertyPath));

    String argument = node.getArguments().getFirst();

    try {
      BigDecimal numericArg = new BigDecimal(argument);
      Expression<BigDecimal> jsonValueAsNumeric = jsonValue.as(BigDecimal.class);

      switch (node.getOperator().getSymbol()) {
        case "==":
          return builder.equal(jsonValueAsNumeric, numericArg);
        case "!=":
          return builder.notEqual(jsonValueAsNumeric, numericArg);
        case ">", "=gt=":
          return builder.greaterThan(jsonValueAsNumeric, numericArg);
        case ">=", "=ge=":
          return builder.greaterThanOrEqualTo(jsonValueAsNumeric, numericArg);
        case "<", "=lt=":
          return builder.lessThan(jsonValueAsNumeric, numericArg);
        case "<=", "=le=":
          return builder.lessThanOrEqualTo(jsonValueAsNumeric, numericArg);
      }
    } catch (NumberFormatException e) {
      // Not a number, proceed with boolean or string comparison
    }

    if ("true".equalsIgnoreCase(argument) || "false".equalsIgnoreCase(argument)) {
      Expression<Boolean> jsonValueAsBoolean = jsonValue.as(Boolean.class);
      Boolean boolArg = Boolean.parseBoolean(argument);
      switch (node.getOperator().getSymbol()) {
        case "==":
          return builder.equal(jsonValueAsBoolean, boolArg);
        case "!=":
          return builder.notEqual(jsonValueAsBoolean, boolArg);
      }
    }

    return switch (node.getOperator().getSymbol()) {
      case "==" ->
          builder.like(
              builder.lower((Expression<String>) jsonValue),
              argument.toLowerCase().replace('*', '%'));
      case "!=" ->
          builder.notLike(
              builder.lower((Expression<String>) jsonValue),
              argument.toLowerCase().replace('*', '%'));
      default -> builder.and();
    };
  }

  /**
   * Recursively traverses the selector path (e.g., "criteria1.type.fieldName") and creates or
   * reuses joins from the given join map. It supports aliases by treating any selector with a
   * trailing number (e.g., "criteria1") as a unique join alias.
   *
   * @param path The current path (root or an existing join).
   * @param selector The RSQL selector string.
   * @param joins A map to cache the created joins.
   * @return The final Path<?> corresponding to the selector.
   */
  private Path<?> getPath(Path<?> path, String selector, Map<String, Join<?, ?>> joins) {
    if (!selector.contains(".")) {
      return path.get(selector);
    }

    String[] parts = selector.split("\\.", 2);
    String joinAlias = parts[0]; // e.g., "criteria", "criteria1", "type"
    String nextSelector = parts[1]; // e.g., "status", "fieldName"

    String attributeName = joinAlias.replaceAll("\\d+$", "");

    Join<?, ?> join = computeJoin(path, joinAlias, attributeName, joins);
    return getPath(join, nextSelector, joins); // Recurse with the new path
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
