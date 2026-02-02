package com.linguist.core.mastery.dto;

import jakarta.validation.constraints.Min;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubmitExercisesRequest {
    @Min(0)
    private int correctCount;
    @Min(1)
    private int totalCount;
}
