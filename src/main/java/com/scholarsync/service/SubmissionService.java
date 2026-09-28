package com.scholarsync.service;

import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.submission.FeedbackResponse;
import com.scholarsync.dto.submission.SubmissionResponse;
import com.scholarsync.dto.submission.UpdateSubmissionStatusRequest;
import com.scholarsync.entity.SubmissionSnapshot;
import com.scholarsync.security.UserPrincipal;

import java.util.List;

public interface SubmissionService {

    SubmissionResponse createSubmission(Long taskId, CreateSubmissionRequest request, UserPrincipal currentUser);

    List<SubmissionResponse> getSubmissionsForTask(Long taskId, UserPrincipal currentUser);

    SubmissionResponse getSubmissionById(Long submissionId, UserPrincipal currentUser);

    SubmissionSnapshot getSubmissionSnapshot(Long submissionId, UserPrincipal currentUser);

    FeedbackResponse addFeedback(Long submissionId, FeedbackRequest request, UserPrincipal currentUser);

    SubmissionResponse updateSubmissionStatus(Long submissionId, UpdateSubmissionStatusRequest request, UserPrincipal currentUser);
}
