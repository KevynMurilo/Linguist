package com.linguist.core.exception;

public class InvalidProviderException extends RuntimeException {

    public InvalidProviderException(String provider) {
        super(String.format("Unsupported AI provider: '%s'. Supported: gemini, openai, perplexity, deepseek", provider));
    }
}
