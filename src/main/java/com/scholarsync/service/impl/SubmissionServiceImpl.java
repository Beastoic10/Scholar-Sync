package com.scholarsync.service.impl;

import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.submission.FeedbackResponse;
import com.scholarsync.dto.submission.SubmissionResponse;
import com.scholarsync.entity.*;
import com.scholarsync.exception.BadRequestException;
import com.scholarsync.exception.ResourceNotFoundException;
import com.scholarsync.exception.TaskAccessDeniedException;
import com.scholarsync.repository.ResearchSubmissionRepository;
import com.scholarsync.repository.ResearchTaskRepository;
import com.scholarsync.repository.SubmissionFeedbackRepository;
import com.scholarsync.repository.UserRepository;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionServiceImpl implements SubmissionService {

    private static final Pattern VERSION_PATTERN = Pattern.compile("^v?1\\.(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ResearchSubmissionRepository submissionRepository;
    private final SubmissionFeedbackRepository feedbackRepository;
    private final ResearchTaskRepository taskRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public SubmissionResponse createSubmission(Long taskId, CreateSubmissionRequest request, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateSubmissionCreationAccess(task, currentUser);

        User submitter = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        String nextVersion = computeNextVersion(taskId);

        SubmissionStatus initialStatus = Boolean.TRUE.equals(request.getDraft())
                ? SubmissionStatus.DRAFT
                : SubmissionStatus.SUBMITTED;

        ResearchSubmission submission = ResearchSubmission.builder()
                .task(task)
                .versionNumber(nextVersion)
                .submittedBy(submitter)
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .artifactLocation(request.getArtifactLocation() != null ? request.getArtifactLocation().trim() : null)
                .status(initialStatus)
                .build();

        ResearchSubmission savedSubmission = submissionRepository.save(submission);
        log.info("Created submission '{}' ({}) for task id: '{}' by user: '{}', status: '{}'",
                savedSubmission.getTitle(), nextVersion, taskId, submitter.getEmail(), initialStatus);

        // Note: Task state is intentionally KEPT SEPARATE from submission status.
        return SubmissionResponse.fromEntity(savedSubmission);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissionsForTask(Long taskId, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateTaskProjectAccess(task, currentUser.getId());

        List<ResearchSubmission> submissions = submissionRepository.findByTaskIdWithDetails(taskId);
        return submissions.stream()
                .map(SubmissionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionById(Long submissionId, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        validateTaskProjectAccess(submission.getTask(), currentUser.getId());

        return SubmissionResponse.fromEntity(submission);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionSnapshot getSubmissionSnapshot(Long submissionId, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        validateTaskProjectAccess(submission.getTask(), currentUser.getId());

        return submission.toSnapshot();
    }

    @Override
    @Transactional
    public SubmissionResponse submitDraft(Long submissionId, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        if (!submission.getSubmittedBy().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the author of the draft submission can submit it");
        }

        if (submission.getStatus() != SubmissionStatus.DRAFT) {
            throw new BadRequestException("Only submissions in DRAFT status can be submitted");
        }

        submission.setStatus(SubmissionStatus.SUBMITTED);
        ResearchSubmission updated = submissionRepository.save(submission);
        log.info("Submission id: '{}' transitioned from DRAFT to SUBMITTED by author: '{}'",
                submissionId, currentUser.getEmail());

        return SubmissionResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public SubmissionResponse reviewSubmission(Long submissionId, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        validateSupervisorAccess(submission.getTask().getProject(), currentUser.getId());

        submission.setStatus(SubmissionStatus.UNDER_REVIEW);
        ResearchSubmission updated = submissionRepository.save(submission);
        log.info("Submission id: '{}' marked as UNDER_REVIEW by supervisor: '{}'",
                submissionId, currentUser.getEmail());

        return SubmissionResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public SubmissionResponse approveSubmission(Long submissionId, FeedbackRequest feedbackRequest, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        ResearchProject project = submission.getTask().getProject();
        validateSupervisorAccess(project, currentUser.getId());

        User supervisor = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        submission.setStatus(SubmissionStatus.APPROVED);

        if (feedbackRequest != null && feedbackRequest.getComment() != null && !feedbackRequest.getComment().trim().isEmpty()) {
            SubmissionFeedback feedback = SubmissionFeedback.builder()
                    .submission(submission)
                    .supervisor(supervisor)
                    .comment(feedbackRequest.getComment().trim())
                    .build();
            submission.addFeedback(feedback);
        }

        ResearchSubmission updated = submissionRepository.save(submission);
        log.info("Submission id: '{}' APPROVED by supervisor '{}'", submissionId, supervisor.getEmail());

        // Note: Task state is intentionally KEPT SEPARATE from submission status.
        return SubmissionResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public SubmissionResponse rejectSubmission(Long submissionId, FeedbackRequest feedbackRequest, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        ResearchProject project = submission.getTask().getProject();
        validateSupervisorAccess(project, currentUser.getId());

        User supervisor = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        submission.setStatus(SubmissionStatus.REJECTED);

        if (feedbackRequest != null && feedbackRequest.getComment() != null && !feedbackRequest.getComment().trim().isEmpty()) {
            SubmissionFeedback feedback = SubmissionFeedback.builder()
                    .submission(submission)
                    .supervisor(supervisor)
                    .comment(feedbackRequest.getComment().trim())
                    .build();
            submission.addFeedback(feedback);
        }

        ResearchSubmission updated = submissionRepository.save(submission);
        log.info("Submission id: '{}' REJECTED by supervisor '{}'", submissionId, supervisor.getEmail());

        // Note: Rejected version remains permanently in history.
        return SubmissionResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public FeedbackResponse addFeedback(Long submissionId, FeedbackRequest request, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        validateSupervisorAccess(submission.getTask().getProject(), currentUser.getId());

        User supervisor = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        SubmissionFeedback feedback = SubmissionFeedback.builder()
                .submission(submission)
                .supervisor(supervisor)
                .comment(request.getComment().trim())
                .build();

        submission.addFeedback(feedback);
        SubmissionFeedback saved = feedbackRepository.save(feedback);

        log.info("Supervisor '{}' added feedback on submission id: '{}'", supervisor.getEmail(), submissionId);

        return FeedbackResponse.fromEntity(saved);
    }

    private String computeNextVersion(Long taskId) {
        List<String> versionNumbers = submissionRepository.findVersionNumbersByTaskId(taskId);
        if (versionNumbers == null || versionNumbers.isEmpty()) {
            return "v1.0";
        }

        int maxMinor = -1;
        for (String v : versionNumbers) {
            if (v != null) {
                Matcher matcher = VERSION_PATTERN.matcher(v.trim());
                if (matcher.matches()) {
                    try {
                        int minor = Integer.parseInt(matcher.group(1));
                        if (minor > maxMinor) {
                            maxMinor = minor;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        if (maxMinor == -1) {
            return "v1." + versionNumbers.size();
        }
        return "v1." + (maxMinor + 1);
    }

    private void validateSubmissionCreationAccess(ResearchTask task, UserPrincipal currentUser) {
        ResearchProject project = task.getProject();
        boolean isSupervisor = project.getSupervisor().getId().equals(currentUser.getId());
        if (isSupervisor) {
            return;
        }

        if (currentUser.getRole() != Role.STUDENT) {
            throw new AccessDeniedException("Only students or the project supervisor can create submissions");
        }

        boolean isMember = project.getStudents().stream().anyMatch(s -> s.getId().equals(currentUser.getId()));
        if (!isMember) {
            throw new TaskAccessDeniedException("You are not an enrolled student in this project");
        }

        if (task.getAssignedStudent() != null && !task.getAssignedStudent().getId().equals(currentUser.getId())) {
            throw new TaskAccessDeniedException("You can only create submissions for tasks assigned to you");
        }
    }

    private void validateTaskProjectAccess(ResearchTask task, Long userId) {
        ResearchProject project = task.getProject();
        boolean isSupervisor = project.getSupervisor().getId().equals(userId);
        boolean isEnrolledStudent = project.getStudents().stream().anyMatch(s -> s.getId().equals(userId));

        if (!isSupervisor && !isEnrolledStudent) {
            throw new TaskAccessDeniedException("You do not have permission to access deliverables for this task");
        }
    }

    private void validateSupervisorAccess(ResearchProject project, Long userId) {
        if (!project.getSupervisor().getId().equals(userId)) {
            throw new AccessDeniedException("Only the project supervisor can review or provide feedback on submissions");
        }
    }
}
