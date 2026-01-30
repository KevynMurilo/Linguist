package com.linguist.core.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Payload for user login")
public class LoginRequest {

    @NotBlank
    @Email
    @Schema(example = "john@example.com")
    private String email;

    @NotBlank
    @Schema(example = "mypassword123")
    private String password;
}
