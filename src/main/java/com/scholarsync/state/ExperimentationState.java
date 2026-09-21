package com.scholarsync.state;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;
import com.scholarsync.exception.InvalidTaskTransitionException;
import org.springframework.stereotype.Component;

@Component
public class ExperimentationState implements TaskState {

    @Override
    public TaskStateEnum getStateEnum() {
        return TaskStateEnum.EXPERIMENTATION;
    }

    @Override
    public void transition(ResearchTask task, TaskStateEnum targetState, User currentUser) {
        if (targetState == TaskStateEnum.UNDER_REVIEW) {
            task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
            return;
        }

        if (targetState == TaskStateEnum.LITERATURE_REVIEW) {
            task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
            return;
        }

        throw new InvalidTaskTransitionException(TaskStateEnum.EXPERIMENTATION, targetState);
    }
}
