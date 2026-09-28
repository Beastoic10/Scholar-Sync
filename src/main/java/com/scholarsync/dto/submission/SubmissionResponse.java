package com.scholarsync.dto.submission;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.ResearchSubmission;
import com.scholarsync.entity.SubmissionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionResponse {

    private Long id;
    private Long taskId;
    private String taskTitle;
    private String versionNumber;
    private UserResponse submittedBy;
    private String title;
    private String description;
    private String artifactLocation;
    private String fileName;
    private String filePath;
    private SubmissionStatus status;
    private AnalysisReportResponse analysisReport;
    private List<FeedbackResponse> feedbackList;
    private Instant createdAt;
    private Instant updatedAt;

    public static SubmissionResponse fromEntity(ResearchSubmission submission) {
        if (submission == null) {
            return null;
        }

        List<FeedbackResponse> feedbacks = Collections.emptyList();
        if (submission.getFeedbackList() != null) {
            feedbacks = submission.getFeedbackList().stream()
                    .map(FeedbackResponse::fromEntity)
                    .collect(Collectors.toList());
        }

        return SubmissionResponse.builder()
                .id(submission.getId())
                .taskId(submission.getTask() != null ? submission.getTask().getId() : null)
                .taskTitle(submission.getTask() != null ? submission.getTask().getTitle() : null)
                .versionNumber(submission.getVersionNumber())
                .submittedBy(submission.getSubmittedBy() != null ? UserResponse.fromEntity(submission.getSubmittedBy()) : null)
                .title(submission.getTitle())
                .description(submission.getDescription())
                .artifactLocation(submission.getArtifactLocation())
                .fileName(submission.getFileName())
                .filePath(submission.getFilePath())
                .status(submission.getStatus())
                .analysisReport(AnalysisReportResponse.fromEntity(submission.getAnalysisReport()))
                .feedbackList(feedbacks)
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .build();
    }
}
