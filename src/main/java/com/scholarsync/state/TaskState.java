package com.scholarsync.state;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;

public interface TaskState {

    TaskStateEnum getStateEnum();

    void transition(ResearchTask task, TaskStateEnum targetState, User currentUser);
}
