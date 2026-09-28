package com.scholarsync.dto.submission;

import com.scholarsync.entity.AnalysisReport;
import com.scholarsync.entity.AnalysisStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisReportResponse {

    private Long id;
    private Double similarityScore;
    private String similarityType;
    private Integer comparedDocumentsCount;
    private String aiDetectionResult;
    private String aiDetectionStatus;
    private String aiDetectionError;
    private Integer totalCitations;
    private Integer verifiedCitations;
    private Integer unverifiedCitations;
    private String citationDetails;
    private AnalysisStatus status;
    private String failureReason;
    private Instant analyzedAt;

    public static AnalysisReportResponse fromEntity(AnalysisReport report) {
        if (report == null) {
            return null;
        }

        return AnalysisReportResponse.builder()
                .id(report.getId())
                .similarityScore(report.getSimilarityScore())
                .similarityType(report.getSimilarityType())
                .comparedDocumentsCount(report.getComparedDocumentsCount())
                .aiDetectionResult(report.getAiDetectionResult())
                .aiDetectionStatus(report.getAiDetectionStatus())
                .aiDetectionError(report.getAiDetectionError())
                .totalCitations(report.getTotalCitations())
                .verifiedCitations(report.getVerifiedCitations())
                .unverifiedCitations(report.getUnverifiedCitations())
                .citationDetails(report.getCitationDetails())
                .status(report.getStatus())
                .failureReason(report.getFailureReason())
                .analyzedAt(report.getAnalyzedAt())
                .build();
    }
}
