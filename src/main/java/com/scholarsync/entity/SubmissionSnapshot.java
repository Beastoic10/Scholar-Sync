package com.scholarsync.entity;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

/**
 * Memento representing the immutable deliverable snapshot of a research submission.
 */
@Getter
@Builder
public class SubmissionSnapshot {
    private final String versionNumber;
    private final String title;
    private final String description;
    private final String artifactLocation;
    private final Long submittedById;
    private final String submittedByName;
    private final Instant timestamp;
}

