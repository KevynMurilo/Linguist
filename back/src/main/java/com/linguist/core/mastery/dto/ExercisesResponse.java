package com.linguist.core.mastery.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExercisesResponse {
    private CompetenceResponse competence;
    private List<ExerciseDTO> exercises;
    private List<RelatedLessonDTO> relatedLessons;
}
