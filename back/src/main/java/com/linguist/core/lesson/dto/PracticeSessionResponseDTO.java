package com.linguist.core.lesson.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Historical record of a practice session")
public class PracticeSessionResponseDTO {

    private UUID id;

    @Schema(example = "85", description = "Score achieved in this session")
    private Integer accuracy;

    @Schema(description = "The exact text transcribed during this attempt")
    private String transcribedText;

    @Schema(description = "AI feedback provided at the time")
    private String feedback;

    @Schema(description = "When you practiced")
    private LocalDateTime createdAt;

    @Schema(description = "URL to stream the recorded audio")
    private String audioUrl;
}