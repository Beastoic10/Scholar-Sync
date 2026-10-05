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
    @Builder.Default
    private java.util.List<UserResponse> assignedStudents = new java.util.ArrayList<>();
    private TaskStateEnum currentState;
    private Instant createdAt;
    private Instant updatedAt;

    public static TaskResponse fromEntity(ResearchTask task) {
        if (task == null) {
            return null;
        }

        java.util.List<UserResponse> studentResponses = new java.util.ArrayList<>();
        if (task.getAssignedStudents() != null) {
            for (com.scholarsync.entity.User s : task.getAssignedStudents()) {
                studentResponses.add(UserResponse.fromEntity(s));
            }
        }

        UserResponse primaryStudent = task.getAssignedStudent() != null
                ? UserResponse.fromEntity(task.getAssignedStudent())
                : (!studentResponses.isEmpty() ? studentResponses.get(0) : null);

        if (primaryStudent != null && studentResponses.stream().noneMatch(s -> s.getId().equals(primaryStudent.getId()))) {
            studentResponses.add(0, primaryStudent);
        }

        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .projectId(task.getProject() != null ? task.getProject().getId() : null)
                .projectTitle(task.getProject() != null ? task.getProject().getTitle() : null)
                .assignedStudent(primaryStudent)
                .assignedStudents(studentResponses)
                .currentState(task.getCurrentState())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
