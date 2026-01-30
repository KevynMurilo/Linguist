package com.linguist.core.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request object for chatting with the AI Assistant")
public class AIChatRequest {

    @NotBlank(message = "Message cannot be empty")
    @Schema(example = "How do I use the Present Perfect?", description = "The question or message from the user")
    private String message;

    @NotNull(message = "User ID is required")
    @Schema(description = "The ID of the user asking the question")
    private UUID userId;
}