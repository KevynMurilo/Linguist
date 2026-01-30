package com.linguist.core.ai;

import com.linguist.core.ai.dto.AIChatRequest;
import com.linguist.core.ai.dto.AIChatResponse;
import com.linguist.core.exception.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI Assistant", description = "Global chat assistant for language tutoring and immediate doubt resolution")
public class AIController {

    private final AIService aiService;

    @PostMapping("/chat")
    @Operation(
            summary = "Send a message to the AI Assistant",
            description = "Analyzes the user's message and returns a personalized explanation based on their current English level and native language."
    )
    @ApiResponse(responseCode = "200", description = "Successful response from assistant")
    @ApiResponse(responseCode = "404", description = "User not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "502", description = "AI provider error",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<AIChatResponse> chat(
            @Valid @RequestBody AIChatRequest request,
            @Parameter(description = "AI provider API key (BYOK)", required = true)
            @RequestHeader("X-AI-Key") String apiKey,
            @Parameter(description = "AI provider name", required = true, example = "gemini")
            @RequestHeader("X-AI-Provider") String provider) {

        String answer = aiService.chat(request.getUserId(), request.getMessage(), provider, apiKey);
        return ResponseEntity.ok(new AIChatResponse(answer));
    }
}