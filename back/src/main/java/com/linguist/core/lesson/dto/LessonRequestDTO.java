package com.linguist.core.lesson.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request to generate a personalized lesson")
public class LessonRequestDTO {

    @NotNull
    @Schema(description = "User ID for context enrichment via Mastery Graph")
    private UUID userId;

    @NotBlank
    @Size(min = 3, max = 500)
    @Schema(example = "Space exploration and Mars colonization",
            description = "Any topic or link — the system is universal")
    private String topic;
}
