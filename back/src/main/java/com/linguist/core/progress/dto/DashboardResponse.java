package com.linguist.core.progress.dto;

import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "User's learning progress dashboard")
public class DashboardResponse {

    @Schema(description = "Current proficiency level")
    private LanguageLevel currentLevel;

    @Schema(description = "Suggested next level if eligible for promotion")
    private LanguageLevel nextLevel;

    @Schema(description = "Whether the user is eligible for level promotion")
    private Boolean eligibleForPromotion;

    @Schema(description = "Average mastery across all tracked grammar rules (0-100)")
    private Double averageMastery;

    @Schema(description = "Total number of grammar rules being tracked")
    private Long totalRulesTracked;

    @Schema(description = "Rules with mastery >= 80")
    private Long rulesMastered;

    @Schema(description = "Rules with mastery < 50 (needs attention)")
    private Long rulesWeak;

    @Schema(description = "Average accuracy across all practice sessions (0-100)")
    private Double averageAccuracy;

    @Schema(description = "Total practice sessions completed")
    private Long totalSessions;

    @Schema(description = "Total lessons generated")
    private Long totalLessons;

    @Schema(description = "Lessons completed (accuracy >= 80)")
    private Long lessonsCompleted;

    @Schema(description = "Current consecutive practice day streak")
    private Integer currentStreak;

    @Schema(description = "Longest streak ever achieved")
    private Integer longestStreak;

    @Schema(description = "Date of last practice session")
    private LocalDate lastPracticeDate;

    @Schema(description = "Practice sessions in the last 7 days")
    private Long sessionsLast7Days;

    @Schema(description = "Top 5 weakest grammar rules (needs most practice)")
    private List<String> weakestRules;

    @Schema(description = "Daily goal target (sessions per day)")
    private Integer dailyGoalTarget;

    @Schema(description = "Sessions completed today towards daily goal")
    private Long dailyGoalProgress;

    @Schema(description = "Number of grammar rules due for spaced repetition review")
    private Long dueReviewCount;
}
