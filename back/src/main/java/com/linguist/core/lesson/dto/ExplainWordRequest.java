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
@Schema(description = "Request to explain a specific word or phrase from a lesson")
public class ExplainWordRequest {

    @NotNull
    @Schema(description = "User ID", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID userId;

    @NotNull
    @Schema(description = "Lesson ID where the word appears", example = "550e8400-e29b-41d4-a716-446655440001")
    private UUID lessonId;

    @NotBlank
    @Size(min = 1, max = 200)
    @Schema(description = "The word or phrase to explain", example = "have gone")
    private String word;

    @Size(max = 1000)
    @Schema(description = "The sentence where the word appears (optional, for contextual explanation)",
            example = "I have gone to the store many times.")
    private String context;
}
