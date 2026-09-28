package com.scholarsync.dto.submission;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.SubmissionFeedback;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {

    private Long id;
    private Long submissionId;
    private UserResponse supervisor;
    private String comment;
    private Instant createdAt;

    public static FeedbackResponse fromEntity(SubmissionFeedback feedback) {
        if (feedback == null) {
            return null;
        }

        return FeedbackResponse.builder()
                .id(feedback.getId())
                .submissionId(feedback.getSubmission() != null ? feedback.getSubmission().getId() : null)
                .supervisor(feedback.getSupervisor() != null ? UserResponse.fromEntity(feedback.getSupervisor()) : null)
                .comment(feedback.getComment())
                .createdAt(feedback.getCreatedAt())
                .build();
    }
}
