package com.scholarsync.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "research_submissions", uniqueConstraints = {
    @UniqueConstraint(name = "uk_task_version", columnNames = {"task_id", "version_number"})
}, indexes = {
    @Index(name = "idx_submissions_task", columnList = "task_id"),
    @Index(name = "idx_submissions_submitter", columnList = "submitted_by_id"),
    @Index(name = "idx_submissions_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchSubmission extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private ResearchTask task;

    @Column(name = "version_number", nullable = false, length = 20)
    private String versionNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by_id", nullable = false)
    private User submittedBy;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "artifact_location", length = 500)
    private String artifactLocation;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    @OneToOne(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private AnalysisReport analysisReport;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<SubmissionFeedback> feedbackList = new ArrayList<>();

    public void addFeedback(SubmissionFeedback feedback) {
        feedback.setSubmission(this);
        this.feedbackList.add(feedback);
    }

    /**
     * Creates an immutable Memento snapshot of the deliverables.
     */
    public SubmissionSnapshot toSnapshot() {
        return SubmissionSnapshot.builder()
                .versionNumber(this.versionNumber)
                .title(this.title)
                .description(this.description)
                .artifactLocation(this.artifactLocation)
                .fileName(this.fileName)
                .filePath(this.filePath)
                .submittedById(this.submittedBy != null ? this.submittedBy.getId() : null)
                .submittedByName(this.submittedBy != null ? this.submittedBy.getName() : null)
                .timestamp(this.getCreatedAt())
                .build();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ResearchSubmission that = (ResearchSubmission) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
