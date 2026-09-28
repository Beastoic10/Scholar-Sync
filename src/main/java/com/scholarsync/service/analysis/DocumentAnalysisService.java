package com.scholarsync.service.analysis;

import com.scholarsync.entity.AnalysisReport;
import com.scholarsync.entity.ResearchSubmission;

public interface DocumentAnalysisService {

    /**
     * Executes real document analysis against the FastAPI service.
     * Updates or creates the AnalysisReport for the submission.
     * Never generates or mocks scores on failure.
     */
    AnalysisReport analyzeSubmission(ResearchSubmission submission);
}
