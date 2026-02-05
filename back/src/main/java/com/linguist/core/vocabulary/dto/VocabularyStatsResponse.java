package com.linguist.core.vocabulary.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Vocabulary learning statistics")
public class VocabularyStatsResponse {

    @Schema(description = "Total vocabulary words tracked")
    private Long totalWords;

    @Schema(description = "Words with mastery >= 80")
    private Long masteredWords;

    @Schema(description = "Words due for review")
    private Long dueForReview;
}
