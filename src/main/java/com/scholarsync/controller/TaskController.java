package com.scholarsync.controller;

import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.TaskResponse;
import com.scholarsync.dto.task.TaskTransitionRequest;
import com.scholarsync.dto.task.UpdateTaskRequest;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Research Tasks", description = "Endpoints for managing research tasks and Kanban lifecycle state transitions")
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/api/projects/{projectId}/tasks")
    @Operation(summary = "Create task in project", description = "Creates a new research task in the PROPOSED state within the specified project.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Task created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user does not belong to project"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateTaskRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponse response = taskService.createTask(projectId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/projects/{projectId}/tasks")
    @Operation(summary = "List project tasks", description = "Retrieves all research tasks belonging to the specified project.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tasks retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user does not belong to project"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<List<TaskResponse>> getProjectTasks(
            @PathVariable Long projectId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<TaskResponse> responses = taskService.getProjectTasks(projectId, currentUser);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/api/tasks/{taskId}")
    @Operation(summary = "Get task by ID", description = "Retrieves details of a specific research task.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user cannot access task"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<TaskResponse> getTaskById(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponse response = taskService.getTaskById(taskId, currentUser);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/api/tasks/{taskId}")
    @Operation(summary = "Update task details", description = "Updates task metadata such as title and description. Cannot change lifecycle state.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Task updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponse response = taskService.updateTask(taskId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/tasks/{taskId}")
    @Operation(summary = "Delete task", description = "Deletes a research task. Allowed only for the project supervisor.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only supervisor can delete task"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        taskService.deleteTask(taskId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/tasks/{taskId}/transition")
    @Operation(summary = "Transition task state", description = "Transitions a research task to a new Kanban state according to State Pattern rules.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "State transition successful"),
            @ApiResponse(responseCode = "400", description = "Invalid state transition requested"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - role does not have permission for this transition"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<TaskResponse> transitionTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskTransitionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        TaskResponse response = taskService.transitionTask(taskId, request, currentUser);
        return ResponseEntity.ok(response);
    }
}
