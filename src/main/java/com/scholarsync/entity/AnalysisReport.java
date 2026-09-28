package com.scholarsync.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "analysis_reports", indexes = {
    @Index(name = "idx_analysis_submission", columnList = "submission_id"),
    @Index(name = "idx_analysis_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisReport extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private ResearchSubmission submission;

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Column(name = "similarity_type", length = 100)
    @Builder.Default
    private String similarityType = "Internal Similarity";

    @Column(name = "compared_documents_count")
    @Builder.Default
    private Integer comparedDocumentsCount = 0;

    @Column(name = "ai_detection_result", columnDefinition = "TEXT")
    private String aiDetectionResult;

    @Column(name = "ai_detection_status", length = 50)
    private String aiDetectionStatus;

    @Column(name = "ai_detection_error", columnDefinition = "TEXT")
    private String aiDetectionError;

    @Column(name = "total_citations")
    @Builder.Default
    private Integer totalCitations = 0;

    @Column(name = "verified_citations")
    @Builder.Default
    private Integer verifiedCitations = 0;

    @Column(name = "unverified_citations")
    @Builder.Default
    private Integer unverifiedCitations = 0;

    @Column(name = "citation_details", columnDefinition = "TEXT")
    private String citationDetails;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private AnalysisStatus status = AnalysisStatus.PROCESSING;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "analyzed_at")
    private Instant analyzedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AnalysisReport that = (AnalysisReport) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
