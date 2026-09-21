package com.scholarsync.exception;

public class TaskAccessDeniedException extends RuntimeException {

    public TaskAccessDeniedException(String message) {
        super(message);
    }
}
