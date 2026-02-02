package com.linguist.core.mastery.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseDTO {
    private String question;
    private List<String> options;
    private int correctIndex;
    private String explanation;
}
