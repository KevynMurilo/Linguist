package com.linguist.core.lesson.dto;

import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Generated lesson with AI-powered content and completion tracking")
public class LessonResponseDTO {

    private UUID id;

    @Schema(example = "Space exploration and Mars colonization")
    private String topic;

    @Schema(description = "Simplified text adapted to the user's proficiency level")
    private String simplifiedText;

    @Schema(description = "Comparative phonetic guide using sounds from the student's native language")
    private String phoneticMarkers;

    @Schema(description = "Grammar explanations in the student's native language (A1-A2), mixed (B1-B2), or target language (C1-C2)")
    private String teachingNotes;

    @Schema(description = "Key grammar rules present in the lesson")
    private List<String> grammarFocus;

    @Schema(example = "B1")
    private LanguageLevel level;

    @Schema(example = "0.5", description = "Minimum audio playback speed for Shadowing")
    private Double audioSpeedMin;

    @Schema(example = "1.5", description = "Maximum audio playback speed for Shadowing")
    private Double audioSpeedMax;

    @Schema(description = "Whether the lesson has been completed (accuracy >= 80)")
    private Boolean completed;

    @Schema(description = "Best accuracy score achieved across all attempts")
    private Integer bestScore;

    @Schema(description = "Number of times the user attempted this lesson")
    private Integer timesAttempted;

    @Schema(description = "Timestamp when the lesson was first completed")
    private LocalDateTime completedAt;
}
