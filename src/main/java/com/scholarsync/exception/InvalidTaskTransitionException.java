package com.scholarsync.exception;

import com.scholarsync.entity.TaskStateEnum;

public class InvalidTaskTransitionException extends RuntimeException {

    public InvalidTaskTransitionException(String message) {
        super(message);
    }

    public InvalidTaskTransitionException(TaskStateEnum from, TaskStateEnum to) {
        super(String.format("A task in %s cannot transition directly to %s.", from, to));
    }

    public InvalidTaskTransitionException(TaskStateEnum from, TaskStateEnum to, String reason) {
        super(String.format("Invalid transition from %s to %s: %s", from, to, reason));
    }
}
