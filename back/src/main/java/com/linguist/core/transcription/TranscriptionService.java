package com.linguist.core.transcription;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Slf4j
@Service
@ConditionalOnProperty(name = "whisper.enabled", havingValue = "true")
public class TranscriptionService {

    private final WebClient webClient;
    private final String whisperUrl;

    public TranscriptionService(
            WebClient webClient,
            @Value("${whisper.url:http://linguist-whisper:9000}") String whisperUrl) {
        this.webClient = webClient;
        this.whisperUrl = whisperUrl;
        log.info("[WHISPER] Transcription service enabled. URL: {}", whisperUrl);
    }

    /**
     * Transcribes audio using the local Whisper service.
     * Returns the transcribed text, or null if transcription fails.
     */
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
                log.warn("[WHISPER] Empty response from transcription service");
                return null;
            }

            // Response format: {"text": "transcribed text"}
            // Simple extraction without ObjectMapper dependency
            String text = response;
            if (response.contains("\"text\"")) {
                int start = response.indexOf("\"text\"");
                int valueStart = response.indexOf("\"", start + 6) + 1;
                int valueEnd = response.indexOf("\"", valueStart);
                if (valueStart > 0 && valueEnd > valueStart) {
                    text = response.substring(valueStart, valueEnd);
                }
            }

            text = text.trim();
            if (!text.isEmpty()) {
                log.info("[WHISPER] Transcription successful ({} chars): {}...",
                        text.length(), text.substring(0, Math.min(80, text.length())));
                return text;
            }

            return null;
        } catch (Exception e) {
            log.warn("[WHISPER] Transcription failed, falling back to browser transcription: {}", e.getMessage());
            return null;
        }
    }
}
