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
@Schema(description = "Request to analyze spoken text against the original lesson")
public class SpeechAnalysisRequest {

    @NotNull
    @Schema(description = "User ID for mastery tracking")
    private UUID userId;

    @NotNull
    @Schema(description = "Lesson ID to compare against")
    private UUID lessonId;

    @NotBlank
    @Size(max = 10000)
    @Schema(description = "The text the user actually spoke (from speech-to-text)")
    private String spokenText;
}
