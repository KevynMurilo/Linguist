package com.linguist.core.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguist.core.exception.AIProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Slf4j
@Component
public class GeminiClient extends BaseAIClient {

    private static final String MODEL_NAME = "gemini-1.5-flash";
    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private final ObjectMapper objectMapper;

    public GeminiClient(WebClient webClient, ObjectMapper objectMapper) {
        super(webClient);
        this.objectMapper = objectMapper;
    }

    @Override
    public AIProvider getProvider() { 
        return AIProvider.GEMINI; 
    }

    @Override
    public String generateContent(String systemPrompt, String userPrompt, String apiKey) {
        log.info("[GEMINI] Iniciando geração de conteúdo. Modelo: {}", MODEL_NAME);
        log.debug("[GEMINI] System Prompt: {}", systemPrompt);
        log.debug("[GEMINI] User Prompt: {}", userPrompt);

        // A URL do Gemini exige a API Key como parâmetro de query
        String url = BASE_URL + MODEL_NAME + ":generateContent?key=" + apiKey;

        // Montagem do body
        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", userPrompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 1000
                )
        );

        try {
            log.info("[GEMINI] Enviando requisição para a Google...");
            // Headers vazios pois a key vai na URL
            String response = postJson(url, Map.of(), body);
            
            String extractedText = extractGeminiText(response);
            log.info("[GEMINI] Resposta processada com sucesso. Tamanho: {} caracteres", extractedText.length());
            return extractedText;
            
        } catch (AIProviderException e) {
            log.error("[GEMINI] Erro reportado pelo provedor: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("[GEMINI] Erro inesperado na comunicação: {}", e.getMessage(), e);
            throw new AIProviderException("GEMINI", "Erro interno na integração com Gemini", e);
        }
    }

    @Override
    public String analyzeSpeech(String systemPrompt, String userPrompt, String apiKey) {
        log.info("[GEMINI] Iniciando análise de fala (analyzeSpeech) - somente texto");
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    @Override
    public boolean supportsAudioInput() {
        return true;
    }

    @Override
    public String analyzeSpeechWithAudio(String systemPrompt, String userPrompt, byte[] audioData, String apiKey) {
        log.info("[GEMINI] Iniciando análise de fala COM ÁUDIO. Modelo: {}", MODEL_NAME);

        String url = BASE_URL + MODEL_NAME + ":generateContent?key=" + apiKey;

        String audioBase64 = Base64.getEncoder().encodeToString(audioData);

        // Build parts: text prompt + audio data
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", userPrompt));
        parts.add(Map.of("inline_data", Map.of(
                "mime_type", "audio/webm",
                "data", audioBase64
        )));

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of(
                        "temperature", 0.5,
                        "maxOutputTokens", 1500
                )
        );

        try {
            log.info("[GEMINI] Enviando áudio ({} bytes) para análise...", audioData.length);
            String response = postJson(url, Map.of(), body);
            String extractedText = extractGeminiText(response);
            log.info("[GEMINI] Análise com áudio concluída. Tamanho: {} caracteres", extractedText.length());
            return extractedText;
        } catch (AIProviderException e) {
            log.warn("[GEMINI] Falha na análise com áudio, tentando somente texto: {}", e.getMessage());
            return analyzeSpeech(systemPrompt, userPrompt, apiKey);
        } catch (Exception e) {
            log.warn("[GEMINI] Erro no áudio, fallback para texto: {}", e.getMessage());
            return analyzeSpeech(systemPrompt, userPrompt, apiKey);
        }
    }

    @Override
    public String explainWord(String systemPrompt, String userPrompt, String apiKey) {
        log.info("[GEMINI] Iniciando explicação de palavra (explainWord)");
        return generateContent(systemPrompt, userPrompt, apiKey);
    }

    private String extractGeminiText(String json) {
        log.debug("[GEMINI] JSON recebido: {}", json);
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode textNode = root.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text");
            
            if (textNode.isMissingNode()) {
                log.error("[GEMINI] Estrutura do JSON inválida ou bloqueada por segurança. JSON: {}", json);
                throw new AIProviderException("GEMINI", "Resposta da IA veio vazia ou foi bloqueada pelos filtros de segurança.");
            }
            
            return textNode.asText();
        } catch (Exception e) {
            log.error("[GEMINI] Falha ao realizar o parse do JSON. Erro: {}", e.getMessage());
            throw new AIProviderException("GEMINI", "Falha ao processar JSON da IA", e);
        }
    }
}