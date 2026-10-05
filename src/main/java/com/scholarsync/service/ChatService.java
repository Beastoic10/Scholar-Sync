package com.scholarsync.service;

import com.scholarsync.dto.chat.ChatMessageResponse;
import com.scholarsync.dto.chat.SendMessageRequest;
import com.scholarsync.dto.chat.TaskChatResponse;
import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskChat;
import com.scholarsync.security.UserPrincipal;

import java.util.List;

public interface ChatService {

    TaskChat getOrCreateChatForTask(ResearchTask task);

    void syncTaskChatParticipants(ResearchTask task);

    TaskChatResponse getTaskChat(Long taskId, UserPrincipal currentUser);

    List<ChatMessageResponse> getChatMessages(Long taskId, UserPrincipal currentUser);

    ChatMessageResponse sendMessage(Long taskId, SendMessageRequest request, UserPrincipal currentUser);
}
