package com.linguist.core.ai;

public interface AIClient {

    AIProvider getProvider();

    String generateContent(String systemPrompt, String userPrompt, String apiKey);

    String analyzeSpeech(String systemPrompt, String userPrompt, String apiKey);

    String explainWord(String systemPrompt, String userPrompt, String apiKey);
}
