package com.linguist.core.challenge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WritingAnalysis {

    private int score;
    private String feedback;
    private List<WritingError> errors;
    private GradingBreakdown grading;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WritingError {
        private String original;
        private String correction;
        private String rule;
        private String explanation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GradingBreakdown {
        private int grammar;
        private int vocabulary;
        private int coherence;
        private int spelling;
        private int levelAppropriateness;
    }
}
