package com.scholarsync.state;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;
import com.scholarsync.exception.InvalidTaskTransitionException;
import com.scholarsync.exception.TaskAccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class UnderReviewState implements TaskState {

    @Override
    public TaskStateEnum getStateEnum() {
        return TaskStateEnum.UNDER_REVIEW;
    }

    @Override
    public void transition(ResearchTask task, TaskStateEnum targetState, User currentUser) {
        if (targetState == TaskStateEnum.APPROVED) {
            if (currentUser.getRole() != Role.SUPERVISOR) {
                throw new TaskAccessDeniedException("Students cannot approve tasks. Only a supervisor can approve tasks under review.");
            }
            task.setCurrentState(TaskStateEnum.APPROVED);
            return;
        }

        if (targetState == TaskStateEnum.EXPERIMENTATION) {
            if (currentUser.getRole() != Role.SUPERVISOR) {
                throw new TaskAccessDeniedException(
                    "Only a supervisor can send a task backward from UNDER_REVIEW to EXPERIMENTATION.");
            }
            task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
            return;
        }

        throw new InvalidTaskTransitionException(TaskStateEnum.UNDER_REVIEW, targetState);
    }
}
