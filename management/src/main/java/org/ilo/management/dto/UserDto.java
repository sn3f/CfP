package org.ilo.management.dto;

import java.time.Instant;
import lombok.Data;

@Data
public class UserDto {
  private String sub;
  private String email;
  private String name;
  private Instant lastSyncedAt;
}
