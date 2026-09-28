package com.scholarsync.controller;

import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.submission.FeedbackResponse;
import com.scholarsync.dto.submission.SubmissionResponse;
import com.scholarsync.dto.submission.UpdateSubmissionStatusRequest;
import com.scholarsync.entity.SubmissionSnapshot;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.SubmissionService;
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
@RequiredArgsConstructor
@Tag(name = "Deliverables & Submissions", description = "Endpoints for managing versioned deliverables, review feedbacks, and Memento snapshots")
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping("/api/tasks/{taskId}/submissions")
    @Operation(summary = "Submit task deliverable", description = "Submits a new versioned research deliverable for the specified task. Automatically assigns next version number (v1, v2...).")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Submission created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user does not belong to project"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<SubmissionResponse> createSubmission(
            @PathVariable Long taskId,
            @Valid @RequestBody CreateSubmissionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.createSubmission(taskId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/tasks/{taskId}/submissions")
    @Operation(summary = "Get task submissions", description = "Retrieves all deliverable versions submitted for the specified task, including feedback threads.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submissions retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForTask(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<SubmissionResponse> responses = submissionService.getSubmissionsForTask(taskId, currentUser);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/api/submissions/{submissionId}")
    @Operation(summary = "Get submission details", description = "Retrieves details of a specific submission version including its full feedback trail.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submission retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> getSubmissionById(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.getSubmissionById(submissionId, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/submissions/{submissionId}/snapshot")
    @Operation(summary = "Get deliverable Memento snapshot", description = "Retrieves the immutable snapshot memento of a research deliverable version.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Snapshot retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionSnapshot> getSubmissionSnapshot(
            @PathVariable Long submissionId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionSnapshot snapshot = submissionService.getSubmissionSnapshot(submissionId, currentUser);
        return ResponseEntity.ok(snapshot);
    }

    @PostMapping("/api/submissions/{submissionId}/feedback")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Add supervisor feedback", description = "Adds review feedback comment to a submission. Restricted to supervisors.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Feedback added successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor can add feedback"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<FeedbackResponse> addFeedback(
            @PathVariable Long submissionId,
            @Valid @RequestBody FeedbackRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        FeedbackResponse response = submissionService.addFeedback(submissionId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/api/submissions/{submissionId}/status")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Review submission status", description = "Updates submission status (e.g. APPROVED, REJECTED, UNDER_REVIEW) and optionally attaches review comments. Restricted to supervisors.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor can review submissions"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> updateSubmissionStatus(
            @PathVariable Long submissionId,
            @Valid @RequestBody UpdateSubmissionStatusRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.updateSubmissionStatus(submissionId, request, currentUser);
        return ResponseEntity.ok(response);
    }
}
