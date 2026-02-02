package com.linguist.core.mastery.dto;

import com.linguist.core.lesson.Lesson;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RelatedLessonDTO {
    private UUID id;
    private String topic;
    private String targetLanguage;
    private Integer bestScore;
    private Boolean completed;

    public static RelatedLessonDTO from(Lesson lesson) {
        return RelatedLessonDTO.builder()
                .id(lesson.getId())
                .topic(lesson.getTopic())
                .targetLanguage(lesson.getTargetLanguage())
                .bestScore(lesson.getBestScore())
                .completed(lesson.getCompleted())
                .build();
    }
}
