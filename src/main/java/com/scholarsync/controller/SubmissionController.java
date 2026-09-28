package com.scholarsync.controller;

import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.submission.FeedbackResponse;
import com.scholarsync.dto.submission.SubmissionResponse;
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
@Tag(name = "Deliverables & Submissions", description = "Endpoints for managing immutable versioned deliverables (v1.0, v1.1...), feedback, and Memento snapshots")
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping("/api/tasks/{taskId}/submissions")
    @Operation(summary = "Create task submission", description = "Creates a new immutable research submission version (v1.0, v1.1, etc.) for the specified task.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Submission created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - student not assigned or unauthorized"),
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
    @Operation(summary = "Get task submissions", description = "Retrieves all deliverable versions submitted for the specified task, including feedback history.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submissions retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - user does not belong to project"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForTask(
            @PathVariable Long taskId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<SubmissionResponse> responses = submissionService.getSubmissionsForTask(taskId, currentUser);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/api/submissions/{id}")
    @Operation(summary = "Get submission details", description = "Retrieves details of a specific submission version including its full feedback trail.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submission retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> getSubmissionById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.getSubmissionById(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/submissions/{id}/submit")
    @Operation(summary = "Submit draft deliverable", description = "Transitions a DRAFT deliverable to SUBMITTED status. Permitted for the author.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Draft submitted successfully"),
            @ApiResponse(responseCode = "400", description = "Submission is not in DRAFT status"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - not the submission author"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> submitDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.submitDraft(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/submissions/{id}/review")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Mark submission under review", description = "Moves submission to UNDER_REVIEW status. Supervisor only.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated to UNDER_REVIEW"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor permitted"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> reviewSubmission(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.reviewSubmission(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/submissions/{id}/approve")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Approve submission", description = "Marks submission as APPROVED and optionally records feedback comment. Supervisor only.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submission approved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor permitted"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> approveSubmission(
            @PathVariable Long id,
            @RequestBody(required = false) FeedbackRequest feedbackRequest,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.approveSubmission(id, feedbackRequest, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/submissions/{id}/reject")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Reject submission", description = "Marks submission as REJECTED and optionally records feedback comment. Supervisor only. Version remains immutable in history.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Submission rejected successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor permitted"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionResponse> rejectSubmission(
            @PathVariable Long id,
            @RequestBody(required = false) FeedbackRequest feedbackRequest,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionResponse response = submissionService.rejectSubmission(id, feedbackRequest, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/submissions/{id}/feedback")
    @PreAuthorize("hasRole('SUPERVISOR')")
    @Operation(summary = "Add supervisor feedback", description = "Adds a review feedback comment to a specific submission version. Supervisor only.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Feedback added successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - only project supervisor permitted"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<FeedbackResponse> addFeedback(
            @PathVariable Long id,
            @Valid @RequestBody FeedbackRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        FeedbackResponse response = submissionService.addFeedback(id, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/submissions/{id}/snapshot")
    @Operation(summary = "Get deliverable Memento snapshot", description = "Retrieves the immutable snapshot memento of a research deliverable version.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Snapshot retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized"),
            @ApiResponse(responseCode = "404", description = "Submission not found")
    })
    public ResponseEntity<SubmissionSnapshot> getSubmissionSnapshot(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        SubmissionSnapshot snapshot = submissionService.getSubmissionSnapshot(id, currentUser);
        return ResponseEntity.ok(snapshot);
    }
}
