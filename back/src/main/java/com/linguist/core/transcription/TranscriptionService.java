package com.linguist.core.transcription;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
@ConditionalOnProperty(name = "whisper.enabled", havingValue = "true")
public class TranscriptionService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String whisperUrl;

    public TranscriptionService(
            WebClient webClient,
            ObjectMapper objectMapper,
            @Value("${whisper.url:http://linguist-whisper:9000}") String whisperUrl) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
        this.whisperUrl = whisperUrl;
    }

    public String transcribe(byte[] audioData, String language) {
        if (audioData == null || audioData.length == 0) {
            return null;
        }

        try {
            String langCode = language != null ? language.split("-")[0] : "en";

            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("audio_file", new ByteArrayResource(audioData) {
                @Override
                public String getFilename() {
                    return "recording.webm";
                }
            }).contentType(MediaType.parseMediaType("audio/webm"));

            String response = webClient.post()
                    .uri(whisperUrl + "/asr?task=transcribe&language=" + langCode + "&output=json")
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(120));

            if (response == null || response.isBlank()) {
                return null;
            }

            String text = null;
            try {
                JsonNode root = objectMapper.readTree(response);
                if (root.has("text")) {
                    text = root.get("text").asText();
                }
            } catch (Exception parseError) {
                if (response.contains("\"text\"")) {
                    int start = response.indexOf("\"text\"");
                    int valueStart = response.indexOf(":", start) + 1;
                    while (valueStart < response.length() && (response.charAt(valueStart) == ' ' || response.charAt(valueStart) == '"')) {
                        valueStart++;
                    }
                    valueStart--;
                    if (response.charAt(valueStart) == '"') {
                        valueStart++;
                        int valueEnd = response.indexOf("\"", valueStart);
                        if (valueEnd > valueStart) {
                            text = response.substring(valueStart, valueEnd);
                        }
                    }
                }
            }

            if (text != null) {
                text = text.trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
