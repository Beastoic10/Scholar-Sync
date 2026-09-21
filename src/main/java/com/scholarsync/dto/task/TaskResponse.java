package com.scholarsync.dto.task;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskStateEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private Long projectId;
    private String projectTitle;
    private UserResponse assignedStudent;
    private TaskStateEnum currentState;
    private Instant createdAt;
    private Instant updatedAt;

    public static TaskResponse fromEntity(ResearchTask task) {
        if (task == null) {
            return null;
        }

        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .projectId(task.getProject() != null ? task.getProject().getId() : null)
                .projectTitle(task.getProject() != null ? task.getProject().getTitle() : null)
                .assignedStudent(task.getAssignedStudent() != null ? UserResponse.fromEntity(task.getAssignedStudent()) : null)
                .currentState(task.getCurrentState())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
