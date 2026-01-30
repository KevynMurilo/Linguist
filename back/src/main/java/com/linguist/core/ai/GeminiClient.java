package com.linguist.core.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.exception.AIProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class GeminiClient extends BaseAIClient {

    private static final String MODEL_NAME = "gemini-1.5-pro";
    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private final ObjectMapper objectMapper;

    public GeminiClient(WebClient webClient, ObjectMapper objectMapper) {
        super(webClient);
        this.objectMapper = objectMapper;
    }

    @Override
    public AIProvider getProvider() { return AIProvider.GEMINI; }

    @Override
    public String generateContent(String systemPrompt, String userPrompt, String apiKey) {
        String url = BASE_URL + MODEL_NAME + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.8
                )
        );

        try {
            return webClient.post()
                    .uri(url)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, response -> {
                        int status = response.statusCode().value();
                        return response.bodyToMono(String.class).flatMap(bodyStr -> {
                            if (status == 404) {
                                return Mono.error(new AIProviderException("MODEL_NOT_FOUND",
                                        "O modelo " + MODEL_NAME + " nao foi encontrado ou a API nao esta ativa no Google Cloud."));
                            }
                            if (status == 429) {
                                return Mono.error(new AIProviderException("QUOTA_EXCEEDED", "Limite de cota do modelo Pro atingido."));
                            }
                            return Mono.error(new AIProviderException("CLIENT_ERROR", bodyStr));
                        });
                    })
                    .bodyToMono(String.class)
                    .map(this::extractGeminiText)
                    .block();
        } catch (AIProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Fatal communication error: {}", e.getMessage());
            throw new AIProviderException("INTERNAL_ERROR", "Erro de conexao com a IA", e);
        }
    }

    @Override
    public String analyzeSpeech(String systemPrompt, String userPrompt, String apiKey) {
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    @Override
    public String explainWord(String systemPrompt, String userPrompt, String apiKey) {
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    private String extractGeminiText(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            log.error("Failed to parse JSON: {}", json);
            throw new AIProviderException("PARSE_ERROR", "Falha ao processar resposta da IA", e);
        }
    }
}