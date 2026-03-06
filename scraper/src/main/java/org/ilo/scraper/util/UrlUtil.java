package org.ilo.scraper.util;

public class UrlUtil {
  public static boolean isNotAPageOrDownloadHref(String href) {
    return href == null
        || href.isEmpty()
        || href.startsWith("mailto:")
        || href.startsWith("tel:")
        || href.startsWith("javascript:")
        || href.equals("#");
  }

  public static String getLastPathElement(String urlString) {
    if (urlString == null || urlString.isEmpty()) {
      return "";
    }

    int lastSlash = urlString.lastIndexOf('/');

    int protocolMarker = urlString.indexOf("://");
    if (protocolMarker != -1 && lastSlash <= protocolMarker + 2) {
      return "";
    }

    String filename;
    if (lastSlash == -1) {
      filename = urlString;
    } else {
      filename = urlString.substring(lastSlash + 1);
    }

    int queryStart = filename.indexOf('?');
    int paramStart = filename.indexOf('&');
    int hashStart = filename.indexOf('#');

    int end = filename.length();

    if (queryStart != -1) {
      end = Math.min(end, queryStart);
    }
    if (paramStart != -1) {
      end = Math.min(end, paramStart);
    }
    if (hashStart != -1) {
      end = Math.min(end, hashStart);
    }

    return filename.substring(0, end);
  }
}
