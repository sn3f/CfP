package org.ilo.scraper.util;

import java.util.AbstractCollection;
import java.util.Iterator;
import java.util.TreeSet;
import org.jetbrains.annotations.NotNull;

public class TopK<E extends Comparable<E>> extends AbstractCollection<E> {
  private final int maxSize;
  private final TreeSet<E> sortedSet;

  public TopK(int maxSize) {
    this.maxSize = maxSize;
    this.sortedSet = new TreeSet<>();
  }

  @Override
  public boolean add(E d) {
    sortedSet.add(d);
    if (sortedSet.size() > maxSize) {
      sortedSet.pollFirst(); // pollFirst() removes the smallest element
    }
    return true;
  }

  @Override
  public @NotNull Iterator<E> iterator() {
    // The iterator for a TreeSet is always in sorted (ascending) order.
    return sortedSet.iterator();
  }

  @Override
  public int size() {
    return sortedSet.size();
  }
}
