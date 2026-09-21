package com.scholarsync.state;

import com.scholarsync.entity.TaskStateEnum;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class TaskStateFactory {

    private final Map<TaskStateEnum, TaskState> stateMap = new EnumMap<>(TaskStateEnum.class);

    public TaskStateFactory(List<TaskState> states) {
        for (TaskState state : states) {
            stateMap.put(state.getStateEnum(), state);
        }
    }

    public TaskState getState(TaskStateEnum stateEnum) {
        TaskState state = stateMap.get(stateEnum);
        if (state == null) {
            throw new IllegalArgumentException("No TaskState implementation found for: " + stateEnum);
        }
        return state;
    }
}
