package com.linguist.core.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Authentication response with JWT token and user data")
public class AuthResponse {

    @Schema(description = "JWT access token")
    private String token;

    @Schema(description = "User profile data")
    private UserResponse user;
}
