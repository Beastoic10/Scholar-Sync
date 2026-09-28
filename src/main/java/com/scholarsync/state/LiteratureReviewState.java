package com.scholarsync.state;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;
import com.scholarsync.exception.InvalidTaskTransitionException;
import com.scholarsync.exception.TaskAccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class LiteratureReviewState implements TaskState {

    @Override
    public TaskStateEnum getStateEnum() {
        return TaskStateEnum.LITERATURE_REVIEW;
    }

    @Override
    public void transition(ResearchTask task, TaskStateEnum targetState, User currentUser) {
        if (targetState == TaskStateEnum.EXPERIMENTATION) {
            task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
            return;
        }

        if (targetState == TaskStateEnum.PROPOSED) {
            if (currentUser.getRole() != Role.SUPERVISOR) {
                throw new TaskAccessDeniedException(
                    "Only a supervisor can send a task backward from LITERATURE_REVIEW to PROPOSED.");
            }
            task.setCurrentState(TaskStateEnum.PROPOSED);
            return;
        }

        throw new InvalidTaskTransitionException(TaskStateEnum.LITERATURE_REVIEW, targetState);
    }
}
