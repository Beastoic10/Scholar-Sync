package com.scholarsync.dto.task;

import com.scholarsync.entity.TaskStateEnum;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTransitionRequest {

    @NotNull(message = "Target state is required")
    private TaskStateEnum targetState;
}
