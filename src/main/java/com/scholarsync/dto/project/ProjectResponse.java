package com.scholarsync.dto.project;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.ResearchProject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String title;
    private String description;
    private UserResponse supervisor;
    private List<UserResponse> students;
    private Instant createdAt;
    private Instant updatedAt;

    public static ProjectResponse fromEntity(ResearchProject project) {
        if (project == null) {
            return null;
        }

        List<UserResponse> studentResponses = project.getStudents() != null
                ? project.getStudents().stream()
                        .map(UserResponse::fromEntity)
                        .collect(Collectors.toList())
                : Collections.emptyList();

        return ProjectResponse.builder()
                .id(project.getId())
                .title(project.getTitle())
                .description(project.getDescription())
                .supervisor(UserResponse.fromEntity(project.getSupervisor()))
                .students(studentResponses)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
