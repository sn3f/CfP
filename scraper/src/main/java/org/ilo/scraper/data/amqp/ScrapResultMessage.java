package org.ilo.scraper.data.amqp;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class ScrapResultMessage {
  private String executionId;
  private String uri;
  private String subId;
  private String pageMarkdown;
  private List<ScrapResultAttachment> attachments;

  @Getter
  @Setter
  @AllArgsConstructor
  public static final class ScrapResultAttachment {
    private String label;
    private String uri;
    private String subId;
    private ContentType contentType;
    private String encodedContent;

    public enum ContentType {
      MARKDOWN,
      BASE64;
    }
  }
}
