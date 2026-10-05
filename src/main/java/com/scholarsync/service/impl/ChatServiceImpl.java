package com.scholarsync.service.impl;

import com.scholarsync.dto.chat.ChatMessageResponse;
import com.scholarsync.dto.chat.SendMessageRequest;
import com.scholarsync.dto.chat.TaskChatResponse;
import com.scholarsync.entity.ChatMessage;
import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskChat;
import com.scholarsync.entity.User;
import com.scholarsync.exception.ResourceNotFoundException;
import com.scholarsync.exception.TaskAccessDeniedException;
import com.scholarsync.repository.ChatMessageRepository;
import com.scholarsync.repository.ResearchTaskRepository;
import com.scholarsync.repository.TaskChatRepository;
import com.scholarsync.repository.UserRepository;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final TaskChatRepository chatRepository;
    private final ChatMessageRepository messageRepository;
    private final ResearchTaskRepository taskRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public TaskChat getOrCreateChatForTask(ResearchTask task) {
        return chatRepository.findByTaskIdWithDetails(task.getId())
                .map(chat -> {
                    syncParticipantsInternal(chat, task);
                    return chatRepository.save(chat);
                })
                .orElseGet(() -> {
                    Set<User> participants = buildInitialParticipants(task);
                    TaskChat chat = TaskChat.builder()
                            .task(task)
                            .participants(participants)
                            .build();
                    TaskChat saved = chatRepository.save(chat);
                    log.info("Created TaskChat id: '{}' for task id: '{}' with {} participants",
                            saved.getId(), task.getId(), participants.size());
                    return saved;
                });
    }

    @Override
    @Transactional
    public void syncTaskChatParticipants(ResearchTask task) {
        chatRepository.findByTaskIdWithDetails(task.getId()).ifPresent(chat -> {
            syncParticipantsInternal(chat, task);
            chatRepository.save(chat);
            log.info("Synchronized participants for TaskChat id: '{}', task id: '{}'", chat.getId(), task.getId());
        });
    }

    @Override
    @Transactional
    public TaskChatResponse getTaskChat(Long taskId, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateChatAccess(task, currentUser.getId());

        TaskChat chat = getOrCreateChatForTask(task);
        return TaskChatResponse.fromEntity(chat);
    }

    @Override
    @Transactional
    public List<ChatMessageResponse> getChatMessages(Long taskId, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateChatAccess(task, currentUser.getId());

        TaskChat chat = getOrCreateChatForTask(task);
        List<ChatMessage> messages = messageRepository.findByChatIdOrderByCreatedAtAsc(chat.getId());

        return messages.stream()
                .map(ChatMessageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long taskId, SendMessageRequest request, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateChatAccess(task, currentUser.getId());

        TaskChat chat = getOrCreateChatForTask(task);

        User sender = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        ChatMessage message = ChatMessage.builder()
                .chat(chat)
                .sender(sender)
                .content(request.getContent().trim())
                .build();

        ChatMessage savedMessage = messageRepository.save(message);
        ChatMessageResponse response = ChatMessageResponse.fromEntity(savedMessage);

        // Broadcast to WebSocket subscribers for this task chat in real time
        String taskDestination = "/topic/tasks/" + taskId + "/chat";
        String chatDestination = "/topic/chat/" + chat.getId();
        try {
            messagingTemplate.convertAndSend(taskDestination, response);
            messagingTemplate.convertAndSend(chatDestination, response);
            log.info("Broadcasted chat message id: '{}' to destinations: '{}' and '{}'",
                    savedMessage.getId(), taskDestination, chatDestination);
        } catch (Exception ex) {
            log.error("Failed to broadcast WebSocket message: {}", ex.getMessage(), ex);
        }

        return response;
    }

    private void validateChatAccess(ResearchTask task, Long userId) {
        boolean isSupervisor = task.getProject() != null
                && task.getProject().getSupervisor() != null
                && task.getProject().getSupervisor().getId().equals(userId);

        boolean isAssignedStudent = false;
        if (task.getAssignedStudents() != null) {
            isAssignedStudent = task.getAssignedStudents().stream()
                    .anyMatch(s -> s.getId().equals(userId));
        }
        if (!isAssignedStudent && task.getAssignedStudent() != null) {
            isAssignedStudent = task.getAssignedStudent().getId().equals(userId);
        }

        if (!isSupervisor && !isAssignedStudent) {
            throw new TaskAccessDeniedException("You are not an authorized participant in this task's discussion");
        }
    }

    private Set<User> buildInitialParticipants(ResearchTask task) {
        Set<User> participants = new HashSet<>();
        if (task.getProject() != null && task.getProject().getSupervisor() != null) {
            participants.add(task.getProject().getSupervisor());
        }
        if (task.getAssignedStudents() != null) {
            participants.addAll(task.getAssignedStudents());
        }
        if (task.getAssignedStudent() != null) {
            participants.add(task.getAssignedStudent());
        }
        return participants;
    }

    private void syncParticipantsInternal(TaskChat chat, ResearchTask task) {
        Set<User> updatedParticipants = buildInitialParticipants(task);
        chat.getParticipants().clear();
        chat.getParticipants().addAll(updatedParticipants);
    }
}
