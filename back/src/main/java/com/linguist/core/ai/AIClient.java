package com.linguist.core.ai;

public interface AIClient {

    AIProvider getProvider();

    String generateContent(String systemPrompt, String userPrompt, String apiKey);

    String analyzeSpeech(String systemPrompt, String userPrompt, String apiKey);

    /**
     * Analyze speech with actual audio data for pronunciation feedback.
     * Providers that don't support audio should fall back to text-only analysis.
     */
    default String analyzeSpeechWithAudio(String systemPrompt, String userPrompt, byte[] audioData, String apiKey) {
        return analyzeSpeech(systemPrompt, userPrompt, apiKey);
    }

    /**
     * Whether this provider supports audio input for analysis.
     */
    default boolean supportsAudioInput() {
        return false;
    }

    String explainWord(String systemPrompt, String userPrompt, String apiKey);
}
