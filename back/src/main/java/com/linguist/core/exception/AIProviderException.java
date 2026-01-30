package com.linguist.core.exception;

import lombok.Getter;

@Getter
public class AIProviderException extends RuntimeException {

    private final String code;

    public AIProviderException(String code, String message) {
        super(message);
        this.code = code;
    }

    public AIProviderException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}