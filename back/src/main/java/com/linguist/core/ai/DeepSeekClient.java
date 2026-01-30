package com.linguist.core.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.exception.AIProviderException;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class DeepSeekClient extends BaseAIClient {

    private static final String BASE_URL = "https://api.deepseek.com/chat/completions";
    private final ObjectMapper objectMapper;

    public DeepSeekClient(WebClient webClient, ObjectMapper objectMapper) {
        super(webClient);
        this.objectMapper = objectMapper;
    }

    @Override
    public AIProvider getProvider() {
        return AIProvider.DEEPSEEK;
    }

    @Override
    public String generateContent(String systemPrompt, String userPrompt, String apiKey) {
        Map<String, Object> body = Map.of(
                "model", "deepseek-chat",
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                )
        );

        String response = postJson(BASE_URL, Map.of("Authorization", "Bearer " + apiKey), body);
        return extractDeepSeekText(response);
    }

    @Override
    public String analyzeSpeech(String systemPrompt, String userPrompt, String apiKey) {
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    @Override
    public String explainWord(String systemPrompt, String userPrompt, String apiKey) {
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    private String extractDeepSeekText(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return root.path("choices").path(0)
                    .path("message").path("content").asText();
        } catch (Exception e) {
            throw new AIProviderException("DEEPSEEK", "Failed to parse response: " + e.getMessage(), e);
        }
    }
}
