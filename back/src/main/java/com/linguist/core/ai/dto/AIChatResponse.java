package com.linguist.core.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response object from the AI Assistant")
public class AIChatResponse {

    @Schema(description = "The personalized answer from the AI tutor")
    private String response;
}