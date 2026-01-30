package com.linguist.core.user.dto;

import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Payload for creating a new user")
public class CreateUserRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    @Schema(example = "John Doe")
    private String name;

    @NotBlank
    @Email
    @Size(max = 255)
    @Schema(example = "john@example.com")
    private String email;

    @NotBlank
    @Size(min = 2, max = 10)
    @Schema(example = "pt-BR", description = "Native language code")
    private String nativeLanguage;

    @NotBlank
    @Size(min = 2, max = 10)
    @Schema(example = "en-US", description = "Target language to learn")
    private String targetLanguage;

    @NotNull
    @Schema(example = "A1", description = "Current proficiency level")
    private LanguageLevel level;

    @NotBlank
    @Size(min = 6, max = 100)
    @Schema(example = "mypassword123", description = "Account password (min 6 characters)")
    private String password;
}
