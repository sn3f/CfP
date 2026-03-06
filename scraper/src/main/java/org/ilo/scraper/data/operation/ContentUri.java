package org.ilo.scraper.data.operation;

import java.net.URI;

public record ContentUri(String label, URI uri, String subId) {
  public ContentUri(URI uri) {
    this(null, uri, null);
  }

  public ContentUri(URI uri, String subId) {
    this(null, uri, subId);
  }

  public ContentUri(String label, URI uri) {
    this(label, uri, null);
  }

  public ContentUri(String uri) {
    this(null, URI.create(uri.strip()), null);
  }
}
