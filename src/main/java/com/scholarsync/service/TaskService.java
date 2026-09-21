package com.scholarsync.service;

import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.TaskResponse;
import com.scholarsync.dto.task.TaskTransitionRequest;
import com.scholarsync.dto.task.UpdateTaskRequest;
import com.scholarsync.security.UserPrincipal;

import java.util.List;

public interface TaskService {

    TaskResponse createTask(Long projectId, CreateTaskRequest request, UserPrincipal currentUser);

    List<TaskResponse> getProjectTasks(Long projectId, UserPrincipal currentUser);

    TaskResponse getTaskById(Long taskId, UserPrincipal currentUser);

    TaskResponse updateTask(Long taskId, UpdateTaskRequest request, UserPrincipal currentUser);

    void deleteTask(Long taskId, UserPrincipal currentUser);

    TaskResponse transitionTask(Long taskId, TaskTransitionRequest request, UserPrincipal currentUser);
}
