package com.linguist.core.mastery.dto;

import com.linguist.core.mastery.Competence;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Competence mastery data for a grammar rule")
public class CompetenceResponse {

    private UUID id;

    @Schema(example = "Present Perfect")
    private String ruleName;

    @Schema(example = "45", description = "Mastery level from 0 to 100")
    private Integer masteryLevel;

    private Integer failCount;
    private Integer practiceCount;
    private LocalDateTime lastPracticed;

    public static CompetenceResponse from(Competence c) {
        return CompetenceResponse.builder()
                .id(c.getId())
                .ruleName(c.getRuleName())
                .masteryLevel(c.getMasteryLevel())
                .failCount(c.getFailCount())
                .practiceCount(c.getPracticeCount())
                .lastPracticed(c.getLastPracticed())
                .build();
    }
}
