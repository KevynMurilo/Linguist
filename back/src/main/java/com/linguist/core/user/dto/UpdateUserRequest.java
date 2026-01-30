package com.linguist.core.user.dto;

import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Payload for updating user preferences")
public class UpdateUserRequest {

    @Size(min = 2, max = 100)
    @Schema(example = "John Doe")
    private String name;

    @Size(min = 2, max = 10)
    @Schema(example = "en-US", description = "Target language to learn")
    private String targetLanguage;

    @Schema(example = "B1", description = "Updated proficiency level")
    private LanguageLevel level;
}
