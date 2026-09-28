package com.scholarsync.service.impl;

import com.scholarsync.dto.submission.*;
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
import com.scholarsync.state.TaskState;
import com.scholarsync.state.TaskStateFactory;
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

    private static final Pattern VERSION_PATTERN = Pattern.compile("^v?(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ResearchSubmissionRepository submissionRepository;
    private final SubmissionFeedbackRepository feedbackRepository;
    private final ResearchTaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskStateFactory stateFactory;

    @Override
    @Transactional
    public SubmissionResponse createSubmission(Long taskId, CreateSubmissionRequest request, UserPrincipal currentUser) {
        ResearchTask task = taskRepository.findByIdWithDetails(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchTask", "id", taskId));

        validateTaskProjectAccess(task, currentUser.getId());

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
        log.info("Created submission '{}' ({}) for task id: '{}' by user: '{}'",
                savedSubmission.getTitle(), nextVersion, taskId, submitter.getEmail());

        // If deliverable is submitted and task is in EXPERIMENTATION or LITERATURE_REVIEW,
        // optionally transition task to UNDER_REVIEW automatically if submitter is student
        if (initialStatus == SubmissionStatus.SUBMITTED) {
            if (task.getCurrentState() == TaskStateEnum.EXPERIMENTATION) {
                TaskState currentStateHandler = stateFactory.getState(task.getCurrentState());
                task.transitionTo(currentStateHandler, TaskStateEnum.UNDER_REVIEW, submitter);
                taskRepository.save(task);
                log.info("Auto-transitioned task id: '{}' to UNDER_REVIEW upon submission {}", taskId, nextVersion);
            }
        }

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

    @Override
    @Transactional
    public SubmissionResponse updateSubmissionStatus(Long submissionId, UpdateSubmissionStatusRequest request, UserPrincipal currentUser) {
        ResearchSubmission submission = submissionRepository.findByIdWithDetails(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSubmission", "id", submissionId));

        ResearchProject project = submission.getTask().getProject();
        validateSupervisorAccess(project, currentUser.getId());

        User supervisor = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        submission.setStatus(request.getStatus());

        if (request.getFeedbackComment() != null && !request.getFeedbackComment().trim().isEmpty()) {
            SubmissionFeedback feedback = SubmissionFeedback.builder()
                    .submission(submission)
                    .supervisor(supervisor)
                    .comment(request.getFeedbackComment().trim())
                    .build();
            submission.addFeedback(feedback);
        }

        // If supervisor approved submission and task is under review, transition task to APPROVED
        ResearchTask task = submission.getTask();
        if (request.getStatus() == SubmissionStatus.APPROVED && task.getCurrentState() == TaskStateEnum.UNDER_REVIEW) {
            TaskState currentStateHandler = stateFactory.getState(task.getCurrentState());
            task.transitionTo(currentStateHandler, TaskStateEnum.APPROVED, supervisor);
            taskRepository.save(task);
            log.info("Task id: '{}' transitioned to APPROVED following submission approval", task.getId());
        }

        ResearchSubmission updated = submissionRepository.save(submission);
        log.info("Updated submission id: '{}' status to '{}' by supervisor '{}'",
                submissionId, request.getStatus(), supervisor.getEmail());

        return SubmissionResponse.fromEntity(updated);
    }

    private String computeNextVersion(Long taskId) {
        List<String> versionNumbers = submissionRepository.findVersionNumbersByTaskId(taskId);
        int maxVer = 0;
        for (String v : versionNumbers) {
            if (v != null) {
                Matcher matcher = VERSION_PATTERN.matcher(v.trim());
                if (matcher.matches()) {
                    try {
                        int num = Integer.parseInt(matcher.group(1));
                        if (num > maxVer) {
                            maxVer = num;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return "v" + (maxVer + 1);
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
