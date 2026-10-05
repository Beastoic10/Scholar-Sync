package com.scholarsync.controller;

import com.scholarsync.dto.chat.ChatMessageResponse;
import com.scholarsync.dto.chat.SendMessageRequest;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketChatController {

    private final ChatService chatService;

    @MessageMapping("/tasks/{taskId}/chat/send")
    public void handleSendChatMessage(
            @DestinationVariable Long taskId,
            @Payload SendMessageRequest request,
            Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            chatService.sendMessage(taskId, request, userPrincipal);
        } else {
            log.warn("Unauthorized STOMP chat message attempt on task id: '{}'", taskId);
        }
    }
}
