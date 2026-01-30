package com.linguist.core.progress.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "A single practice session in the user's timeline")
public class TimelineEntry {

    private UUID sessionId;

    private UUID lessonId;

    @Schema(description = "Topic of the lesson practiced")
    private String lessonTopic;

    @Schema(description = "Accuracy score achieved (0-100)")
    private Integer accuracy;

    @Schema(description = "Number of errors in this session")
    private Integer errorCount;

    @Schema(description = "AI feedback for this session")
    private String feedback;

    private LocalDateTime practicedAt;
}
