package org.ilo.management.specification;

import cz.jirutka.rsql.parser.ast.ComparisonNode;
import jakarta.persistence.criteria.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

public abstract class BaseRSQLVisitor {
  @SuppressWarnings({"unchecked", "rawtypes"})
  protected Predicate createPredicate(ComparisonNode node, Path<?> path, CriteriaBuilder builder) {
    Class<?> attributeType = path.getJavaType();
    List<Object> args =
        node.getArguments().stream()
            .map(arg -> parseArgument(arg, attributeType))
            .collect(Collectors.toList());

    Object firstArg = args.getFirst();

    switch (node.getOperator().getSymbol()) {
      case "==":
        if (firstArg instanceof String) {
          return builder.like(builder.lower(path.as(String.class)), toStringTemplate(firstArg));
        }
        return firstArg == null ? builder.isNull(path) : builder.equal(path, firstArg);
      case "!=":
        if (firstArg instanceof String) {
          return builder.notLike(builder.lower(path.as(String.class)), toStringTemplate(firstArg));
        }
        return firstArg == null ? builder.isNotNull(path) : builder.notEqual(path, firstArg);
      case "=gt=", ">":
        if (firstArg instanceof Comparable) {
          return builder.greaterThan((Path<Comparable>) path, (Comparable) firstArg);
        }
        break;
      case "=ge=", ">=":
        if (firstArg instanceof Comparable) {
          return builder.greaterThanOrEqualTo((Path<Comparable>) path, (Comparable) firstArg);
        }
        break;
      case "=lt=", "<":
        if (firstArg instanceof Comparable) {
          return builder.lessThan((Path<Comparable>) path, (Comparable) firstArg);
        }
        break;
      case "=le=", "<=":
        if (firstArg instanceof Comparable) {
          return builder.lessThanOrEqualTo((Path<Comparable>) path, (Comparable) firstArg);
        }
        break;
      case "=in=":
        return path.in(args);
      case "=out=":
        return builder.not(path.in(args));
    }

    throw new IllegalArgumentException(
        "Unsupported operator '"
            + node.getOperator().getSymbol()
            + "' for selector '"
            + node.getSelector()
            + "'");
  }

  protected Object parseArgument(String arg, Class<?> type) {
    if (arg.equalsIgnoreCase("null")) {
      return null;
    }
    if (type.equals(Boolean.class) || type.equals(boolean.class)) {
      return Boolean.parseBoolean(arg);
    }
    if (type.equals(Integer.class) || type.equals(int.class)) {
      return Integer.parseInt(arg);
    }
    if (type.equals(Long.class) || type.equals(long.class)) {
      return Long.parseLong(arg);
    }
    if (type.equals(Double.class) || type.equals(double.class)) {
      return Double.parseDouble(arg);
    }
    if (type.equals(ZonedDateTime.class)) {
      return ZonedDateTime.parse(arg);
    }
    if (type.equals(LocalDate.class)) {
      return LocalDate.parse(arg);
    }
    if (type.isEnum()) {
      return Enum.valueOf((Class<Enum>) type, arg);
    }
    return arg;
  }

  private String toStringTemplate(Object arg) {
    return arg.toString().toLowerCase().replace('*', '%');
  }
}
