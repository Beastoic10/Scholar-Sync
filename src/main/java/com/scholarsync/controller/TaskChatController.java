package com.scholarsync.controller;

import com.scholarsync.dto.chat.ChatMessageResponse;
import com.scholarsync.dto.chat.SendMessageRequest;
import com.scholarsync.dto.chat.TaskChatResponse;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/chat")
@RequiredArgsConstructor
@Tag(name = "Task Chat", description = "Endpoints for task-based real-time group chat and messaging")
public class TaskChatController {

    private final ChatService chatService;

    @GetMapping
    @Operation(summary = "Get or initialize task chat room and participant metadata")
    public ResponseEntity<TaskChatResponse> getTaskChat(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskChatResponse response = chatService.getTaskChat(taskId, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/messages")
    @Operation(summary = "Get previous message history for a task chat")
    public ResponseEntity<List<ChatMessageResponse>> getChatMessages(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<ChatMessageResponse> messages = chatService.getChatMessages(taskId, currentUser);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/messages")
    @Operation(summary = "Send a new message to the task group chat")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @PathVariable Long taskId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ChatMessageResponse response = chatService.sendMessage(taskId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
