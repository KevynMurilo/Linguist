package com.linguist.core.vocabulary.dto;

import com.linguist.core.vocabulary.Vocabulary;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Vocabulary word with SRS review data")
public class VocabularyResponse {

    private UUID id;
    private String word;
    private String translation;
    private String context;
    private Integer masteryLevel;
    private Integer reviewCount;
    private LocalDateTime nextReviewAt;
    private LocalDateTime createdAt;

    public static VocabularyResponse from(Vocabulary v) {
        return VocabularyResponse.builder()
                .id(v.getId())
                .word(v.getWord())
                .translation(v.getTranslation())
                .context(v.getContext())
                .masteryLevel(v.getMasteryLevel())
                .reviewCount(v.getReviewCount())
                .nextReviewAt(v.getNextReviewAt())
                .createdAt(v.getCreatedAt())
                .build();
    }
}
