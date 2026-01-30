package com.linguist.core.lesson.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "AI-powered speech analysis result")
public class SpeechAnalysisResponse {

    @Schema(example = "72", description = "Accuracy score from 0 to 100")
    private Integer accuracy;

    @Schema(description = "List of detected errors with grammar rule mapping")
    private List<SpeechError> errors;

    @Schema(description = "Overall feedback from the AI")
    private String feedback;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @Schema(description = "A single speech error detected by the AI")
    public static class SpeechError {

        @Schema(example = "I have gone")
        private String expected;

        @Schema(example = "I have go")
        private String got;

        @Schema(example = "Present Perfect", description = "Grammar rule violated")
        private String rule;

        @Schema(description = "Short explanation of the error in the student's appropriate language")
        private String tip;
    }
}
