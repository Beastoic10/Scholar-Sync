package com.scholarsync.dto.submission;

import com.scholarsync.entity.SubmissionStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSubmissionStatusRequest {

    @NotNull(message = "Submission status is required")
    private SubmissionStatus status;

    private String feedbackComment;
}
