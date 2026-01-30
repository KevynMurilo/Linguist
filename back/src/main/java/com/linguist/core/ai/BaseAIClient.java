package com.linguist.core.ai;

import com.linguist.core.exception.AIProviderException;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

public abstract class BaseAIClient implements AIClient {

    protected final WebClient webClient;

    protected BaseAIClient(WebClient webClient) {
        this.webClient = webClient;
    }

    protected String postJson(String url, Map<String, String> headers, Object body) {
        try {
            WebClient.RequestBodySpec spec = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON);

            headers.forEach(spec::header);

            return spec.bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (WebClientResponseException e) {
            throw new AIProviderException(
                    getProvider().name(),
                    String.format("HTTP %d: %s", e.getStatusCode().value(), e.getResponseBodyAsString()),
                    e
            );
        } catch (Exception e) {
            throw new AIProviderException(getProvider().name(), e.getMessage(), e);
        }
    }
}
