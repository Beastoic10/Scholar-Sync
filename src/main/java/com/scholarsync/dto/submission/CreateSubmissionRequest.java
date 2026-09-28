package com.scholarsync.dto.submission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubmissionRequest {

    @NotBlank(message = "Submission title is required")
    @Size(max = 200, message = "Submission title cannot exceed 200 characters")
    private String title;

    private String description;

    @Size(max = 500, message = "Artifact location cannot exceed 500 characters")
    private String artifactLocation;

    private String fileName;
    private String filePath;
    private String extractedText;

    @Builder.Default
    private Boolean draft = false;
}
