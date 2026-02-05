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
@Schema(description = "A single activity in the user's timeline")
public class TimelineEntry {

    public enum ActivityType { LESSON, WRITING, LISTENING }

    private UUID sessionId;

    private UUID lessonId;

    @Schema(description = "Type of activity")
    private ActivityType type;

    @Schema(description = "Topic or title of the activity")
    private String title;

    @Schema(description = "Score achieved (0-100)")
    private Integer score;

    @Schema(description = "Number of errors in this session")
    private Integer errorCount;

    @Schema(description = "AI feedback for this session")
    private String feedback;

    private LocalDateTime practicedAt;
}
