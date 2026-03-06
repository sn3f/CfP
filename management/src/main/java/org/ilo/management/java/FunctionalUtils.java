package org.ilo.management.java;

import java.util.function.Function;

public class FunctionalUtils {
  public static <T, R> Function<T, R> quietly(ThrowingFunction<T, R> function) {
    return t -> {
      try {
        return function.apply(t);
      } catch (Exception e) {
        return null;
      }
    };
  }

  @FunctionalInterface
  public interface ThrowingFunction<T, R> {
    R apply(T t) throws Exception;
  }
}
