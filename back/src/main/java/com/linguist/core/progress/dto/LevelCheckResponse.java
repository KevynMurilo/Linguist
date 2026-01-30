package com.linguist.core.progress.dto;

import com.linguist.core.user.LanguageLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Level progression check result")
public class LevelCheckResponse {

    @Schema(description = "Current level before check")
    private LanguageLevel previousLevel;

    @Schema(description = "Current level after check (may have changed)")
    private LanguageLevel currentLevel;

    @Schema(description = "Whether the user was promoted")
    private Boolean promoted;

    @Schema(description = "Average mastery that triggered (or didn't trigger) promotion")
    private Double averageMastery;

    @Schema(description = "Number of rules the user has mastered (>= 80)")
    private Long rulesMastered;

    @Schema(description = "Minimum mastery required for promotion")
    private Integer requiredMastery;

    @Schema(description = "Minimum rules mastered required for promotion")
    private Integer requiredRulesMastered;

    @Schema(description = "Human-readable message about the result")
    private String message;
}
