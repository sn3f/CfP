package org.ilo.management.mapper;

import org.ilo.management.dto.UserDto;
import org.ilo.management.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserDto toDto(User user) {
    if (user == null) {
      return null;
    }
    UserDto userDto = new UserDto();
    userDto.setSub(user.getSub());
    userDto.setEmail(user.getEmail());
    userDto.setName(user.getName());
    userDto.setLastSyncedAt(user.getLastSyncedAt());
    return userDto;
  }

  public User toEntity(UserDto userDto) {
    if (userDto == null) {
      return null;
    }
    User user = new User();
    user.setSub(userDto.getSub());
    user.setEmail(userDto.getEmail());
    user.setName(userDto.getName());
    user.setLastSyncedAt(userDto.getLastSyncedAt());
    return user;
  }
}
