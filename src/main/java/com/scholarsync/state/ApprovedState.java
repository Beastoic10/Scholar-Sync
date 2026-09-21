package com.scholarsync.state;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;
import com.scholarsync.exception.InvalidTaskTransitionException;
import org.springframework.stereotype.Component;

@Component
public class ApprovedState implements TaskState {

    @Override
    public TaskStateEnum getStateEnum() {
        return TaskStateEnum.APPROVED;
    }

    @Override
    public void transition(ResearchTask task, TaskStateEnum targetState, User currentUser) {
        throw new InvalidTaskTransitionException("Task is already in APPROVED state and cannot be transitioned further.");
    }
}
