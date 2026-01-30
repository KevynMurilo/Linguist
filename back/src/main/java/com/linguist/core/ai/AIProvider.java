package com.linguist.core.ai;

import com.linguist.core.exception.InvalidProviderException;

import java.util.Arrays;

public enum AIProvider {
    GEMINI,
    OPENAI,
    PERPLEXITY,
    DEEPSEEK;

    public static AIProvider fromString(String value) {
        return Arrays.stream(values())
                .filter(p -> p.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new InvalidProviderException(value));
    }
}
