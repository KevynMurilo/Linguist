package com.linguist.core.mastery.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitExercisesResponse {
    private int previousMastery;
    private int newMastery;
    private int change;
    private CompetenceResponse competence;
}
