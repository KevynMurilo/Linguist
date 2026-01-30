package com.linguist.core.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, Object id) {
        super(String.format("%s not found with identifier: %s", resource, id));
    }
}
