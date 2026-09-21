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

    @Override
    @Transactional
    public TaskResponse createTask(Long projectId, CreateTaskRequest request, UserPrincipal currentUser) {
        ResearchProject project = projectRepository.findByIdWithDetails(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchProject", "id", projectId));

        validateProjectAccess(project, currentUser.getId());

        User assignedStudent = null;
        if (request.getAssignedStudentId() != null) {
            assignedStudent = userRepository.findById(request.getAssignedStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getAssignedStudentId()));

            if (assignedStudent.getRole() != Role.STUDENT) {
                throw new BadRequestException("Assigned user must have the STUDENT role");
            }

            final Long studentId = assignedStudent.getId();
            boolean isMember = project.getStudents().stream().anyMatch(s -> s.getId().equals(studentId));
            if (!isMember) {
                throw new BadRequestException("Assigned student is not an enrolled member of this project");
            }
        }

        ResearchTask task = ResearchTask.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .project(project)
                .assignedStudent(assignedStudent)
                .currentState(TaskStateEnum.PROPOSED)
                .build();

        ResearchTask savedTask = taskRepository.save(task);
        log.info("Created research task id: '{}' in project: '{}' by user: '{}'",
                savedTask.getId(), project.getId(), currentUser.getEmail());

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

        if (request.getAssignedStudentId() != null) {
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
            task.setAssignedStudent(student);
        }

        ResearchTask updatedTask = taskRepository.save(task);
        log.info("Updated task id: '{}' by user: '{}'", taskId, currentUser.getEmail());

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
