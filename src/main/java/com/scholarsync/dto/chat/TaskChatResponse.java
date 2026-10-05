package com.scholarsync.dto.chat;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.TaskChat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskChatResponse {

    private Long id;
    private Long taskId;
    private String taskTitle;
    private Long projectId;
    private String projectTitle;
    @Builder.Default
    private List<UserResponse> participants = new ArrayList<>();
    private Instant createdAt;

    public static TaskChatResponse fromEntity(TaskChat chat) {
        if (chat == null) {
            return null;
        }

        List<UserResponse> participantDtos = chat.getParticipants() != null
                ? chat.getParticipants().stream()
                    .map(UserResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return TaskChatResponse.builder()
                .id(chat.getId())
                .taskId(chat.getTask() != null ? chat.getTask().getId() : null)
                .taskTitle(chat.getTask() != null ? chat.getTask().getTitle() : null)
                .projectId(chat.getTask() != null && chat.getTask().getProject() != null ? chat.getTask().getProject().getId() : null)
                .projectTitle(chat.getTask() != null && chat.getTask().getProject() != null ? chat.getTask().getProject().getTitle() : null)
                .participants(participantDtos)
                .createdAt(chat.getCreatedAt())
                .build();
    }
}
