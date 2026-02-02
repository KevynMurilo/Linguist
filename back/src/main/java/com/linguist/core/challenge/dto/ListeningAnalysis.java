package com.linguist.core.challenge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListeningAnalysis {

    private int score;
    private String feedback;
    private String originalText;
    private String typedText;
    private List<WordComparison> words;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WordComparison {
        private String expected;
        private String got;
        private boolean correct;
    }
}
