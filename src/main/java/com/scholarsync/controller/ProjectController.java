package com.scholarsync.controller;

import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.project.ProjectResponse;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Research Projects", description = "Endpoints for creating, managing, and retrieving academic research projects")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Create a research project", description = "Creates a new research project. Only supervisors can perform this action.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Project successfully created"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only supervisors can create projects")
    })
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ProjectResponse response = projectService.createProject(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List user projects", description = "Retrieves all research projects where the user is either the supervisor or an enrolled student")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of projects retrieved"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated")
    })
    public ResponseEntity<List<ProjectResponse>> getUserProjects(@AuthenticationPrincipal UserPrincipal currentUser) {
        List<ProjectResponse> projects = projectService.getUserProjects(currentUser);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID", description = "Retrieves project details. Allowed only if the user is the supervisor or an enrolled student.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project details retrieved"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user does not own or belong to this project"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<ProjectResponse> getProjectById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ProjectResponse project = projectService.getProjectById(id, currentUser);
        return ResponseEntity.ok(project);
    }

    @PostMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Assign a student to project", description = "Adds an existing student to the research project. Allowed only for the project supervisor.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student assigned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid student"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user is not the supervisor"),
            @ApiResponse(responseCode = "404", description = "Project or student not found")
    })
    public ResponseEntity<ProjectResponse> addStudentToProject(
            @PathVariable Long id,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        ProjectResponse project = projectService.addStudentToProject(id, studentId, currentUser);
        return ResponseEntity.ok(project);
    }
}
