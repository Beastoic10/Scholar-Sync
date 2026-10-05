package com.scholarsync.service.impl;

import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.TaskResponse;
import com.scholarsync.dto.task.TaskTransitionRequest;
import com.scholarsync.dto.task.UpdateTaskRequest;
import com.scholarsync.entity.*;
import com.scholarsync.exception.BadRequestException;
import com.scholarsync.exception.ResourceNotFoundException;
import com.scholarsync.exception.TaskAccessDeniedException;
import com.scholarsync.repository.ResearchProjectRepository;
import com.scholarsync.repository.ResearchTaskRepository;
import com.scholarsync.repository.UserRepository;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.TaskService;
import com.scholarsync.state.TaskState;
import com.scholarsync.state.TaskStateFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final ResearchTaskRepository taskRepository;
    private final ResearchProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TaskStateFactory stateFactory;
    private final com.scholarsync.service.ChatService chatService;
    private final com.scholarsync.repository.TaskChatRepository chatRepository;
    private final com.scholarsync.repository.ChatMessageRepository messageRepository;

    @Override
    @Transactional
    public TaskResponse createTask(Long projectId, CreateTaskRequest request, UserPrincipal currentUser) {
        ResearchProject project = projectRepository.findByIdWithDetails(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchProject", "id", projectId));

        validateProjectAccess(project, currentUser.getId());

        java.util.Set<User> assignedStudents = new java.util.HashSet<>();
        java.util.List<Long> studentIdsToAssign = new java.util.ArrayList<>();
        if (request.getAssignedStudentIds() != null && !request.getAssignedStudentIds().isEmpty()) {
            studentIdsToAssign.addAll(request.getAssignedStudentIds());
        } else if (request.getAssignedStudentId() != null) {
            studentIdsToAssign.add(request.getAssignedStudentId());
        }

        for (Long studentId : studentIdsToAssign) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

            if (student.getRole() != Role.STUDENT) {
                throw new BadRequestException("Assigned user must have the STUDENT role");
            }

            boolean isMember = project.getStudents().stream().anyMatch(s -> s.getId().equals(studentId));
            if (!isMember) {
                throw new BadRequestException("Assigned student is not an enrolled member of this project");
            }
            assignedStudents.add(student);
        }

        User primaryStudent = !assignedStudents.isEmpty() ? assignedStudents.iterator().next() : null;

        ResearchTask task = ResearchTask.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .project(project)
                .assignedStudent(primaryStudent)
                .assignedStudents(assignedStudents)
                .currentState(TaskStateEnum.PROPOSED)
                .build();

        ResearchTask savedTask = taskRepository.save(task);
        log.info("Created research task id: '{}' in project: '{}' with {} assigned students by user: '{}'",
                savedTask.getId(), project.getId(), assignedStudents.size(), currentUser.getEmail());

        if (!assignedStudents.isEmpty()) {
            chatService.getOrCreateChatForTask(savedTask);
        }

        return TaskResponse.fromEntity(savedTask);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getProjectTasks(Long projectId, UserPrincipal currentUser) {
        ResearchProject project = projectRepository.findByIdWithDetails(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchProject", "id", projectId));

        validateProjectAccess(project, currentUser.getId());

        List<ResearchTask> tasks = taskRepository.findByProjectIdWithDetails(projectId);
        return tasks.stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateProjectAccess(task.getProject(), currentUser.getId());

        return TaskResponse.fromEntity(task);
    }

    @Override
    @Transactional
    public TaskResponse updateTask(Long taskId, UpdateTaskRequest request, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateProjectAccess(task.getProject(), currentUser.getId());

        task.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription().trim());
        }

        if (request.getAssignedStudentIds() != null) {
            java.util.Set<User> newStudents = new java.util.HashSet<>();
            for (Long sId : request.getAssignedStudentIds()) {
                User student = userRepository.findById(sId)
                        .orElseThrow(() -> new ResourceNotFoundException("Student", "id", sId));
                if (student.getRole() != Role.STUDENT) {
                    throw new BadRequestException("Assigned user must have the STUDENT role");
                }
                boolean isMember = task.getProject().getStudents().stream().anyMatch(s -> s.getId().equals(sId));
                if (!isMember) {
                    throw new BadRequestException("Assigned student is not an enrolled member of this project");
                }
                newStudents.add(student);
            }
            task.getAssignedStudents().clear();
            task.getAssignedStudents().addAll(newStudents);
            task.setAssignedStudent(newStudents.isEmpty() ? null : newStudents.iterator().next());
        } else if (request.getAssignedStudentId() != null) {
            User student = userRepository.findById(request.getAssignedStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getAssignedStudentId()));

            if (student.getRole() != Role.STUDENT) {
                throw new BadRequestException("Assigned user must have the STUDENT role");
            }

            final Long studentId = student.getId();
            boolean isMember = task.getProject().getStudents().stream().anyMatch(s -> s.getId().equals(studentId));
            if (!isMember) {
                throw new BadRequestException("Assigned student is not an enrolled member of this project");
            }
            task.getAssignedStudents().clear();
            task.getAssignedStudents().add(student);
            task.setAssignedStudent(student);
        }

        ResearchTask updatedTask = taskRepository.save(task);
        log.info("Updated task id: '{}' by user: '{}'", taskId, currentUser.getEmail());

        if (updatedTask.getAssignedStudents() != null && !updatedTask.getAssignedStudents().isEmpty()) {
            chatService.syncTaskChatParticipants(updatedTask);
        }

        return TaskResponse.fromEntity(updatedTask);
    }

    @Override
    @Transactional
    public void deleteTask(Long taskId, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        if (!task.getProject().getSupervisor().getId().equals(currentUser.getId())) {
            throw new TaskAccessDeniedException("Only the project supervisor can delete tasks");
        }

        chatRepository.findByTaskId(taskId).ifPresent(chat -> {
            messageRepository.findByChatIdOrderByCreatedAtAsc(chat.getId()).forEach(messageRepository::delete);
            chatRepository.delete(chat);
        });

        taskRepository.delete(task);
        log.info("Deleted task id: '{}' by supervisor: '{}'", taskId, currentUser.getEmail());
    }

    @Override
    @Transactional
    public TaskResponse transitionTask(Long taskId, TaskTransitionRequest request, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateProjectAccess(task.getProject(), currentUser.getId());

        User currentUserEntity = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        TaskState stateHandler = stateFactory.getState(task.getCurrentState());
        TaskStateEnum previousState = task.getCurrentState();

        task.transitionTo(stateHandler, request.getTargetState(), currentUserEntity);

        ResearchTask updatedTask = taskRepository.save(task);
        log.info("Transitioned task id: '{}' from '{}' to '{}' by user: '{}' (Role: {})",
                taskId, previousState, updatedTask.getCurrentState(),
                currentUserEntity.getEmail(), currentUserEntity.getRole());

        return TaskResponse.fromEntity(updatedTask);
    }

    private void validateProjectAccess(ResearchProject project, Long userId) {
        boolean isSupervisor = project.getSupervisor().getId().equals(userId);
        boolean isMemberStudent = project.getStudents().stream().anyMatch(s -> s.getId().equals(userId));

        if (!isSupervisor && !isMemberStudent) {
            throw new TaskAccessDeniedException("You do not have permission to access tasks in this project");
        }
    }
}
