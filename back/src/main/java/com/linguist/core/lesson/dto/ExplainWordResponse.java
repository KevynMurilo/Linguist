package com.linguist.core.lesson.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "AI-powered word/phrase explanation with pronunciation, usage, and examples")
public class ExplainWordResponse {

    @Schema(description = "The word or phrase explained", example = "have gone")
    private String word;

    @Schema(description = "Definition in the appropriate language based on student level")
    private String definition;

    @Schema(description = "IPA pronunciation with comparison to native language sounds",
            example = "/hæv ɡɒn/ - 'gone' rima com 'on', o 'g' e forte como em 'gato'")
    private String pronunciation;

    @Schema(description = "When and how to use the word/phrase")
    private String usage;

    @Schema(description = "3 example sentences using the word in context")
    private List<String> examples;

    @Schema(description = "Synonyms or related expressions")
    private List<String> relatedWords;
}
