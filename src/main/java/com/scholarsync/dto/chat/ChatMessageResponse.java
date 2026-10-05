package com.scholarsync.dto.chat;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private Long id;
    private Long chatId;
    private Long taskId;
    private UserResponse sender;
    private String content;
    private Instant createdAt;

    public static ChatMessageResponse fromEntity(ChatMessage message) {
        if (message == null) {
            return null;
        }

        return ChatMessageResponse.builder()
                .id(message.getId())
                .chatId(message.getChat() != null ? message.getChat().getId() : null)
                .taskId(message.getChat() != null && message.getChat().getTask() != null ? message.getChat().getTask().getId() : null)
                .sender(message.getSender() != null ? UserResponse.fromEntity(message.getSender()) : null)
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
