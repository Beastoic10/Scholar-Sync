package com.scholarsync;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.entity.User;
import com.scholarsync.exception.InvalidTaskTransitionException;
import com.scholarsync.exception.TaskAccessDeniedException;
import com.scholarsync.state.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

public class TaskStateTest {

    private TaskStateFactory stateFactory;
    private User supervisor;
    private User student;
    private ResearchTask task;

    @BeforeEach
    void setUp() {
        stateFactory = new TaskStateFactory(Arrays.asList(
                new ProposedState(),
                new LiteratureReviewState(),
                new ExperimentationState(),
                new UnderReviewState(),
                new ApprovedState()
        ));

        supervisor = User.builder()
                .id(1L)
                .name("Dr. Supervisor")
                .email("supervisor@scholarsync.edu")
                .role(Role.SUPERVISOR)
                .build();

        student = User.builder()
                .id(2L)
                .name("Student Researcher")
                .email("student@scholarsync.edu")
                .role(Role.STUDENT)
                .build();

        task = ResearchTask.builder()
                .id(100L)
                .title("Neural Architecture Search")
                .currentState(TaskStateEnum.PROPOSED)
                .build();
    }

    @Test
    @DisplayName("1. PROPOSED -> LITERATURE_REVIEW succeeds")
    void testProposedToLiteratureReviewSucceeds() {
        TaskState state = stateFactory.getState(task.getCurrentState());
        task.transitionTo(state, TaskStateEnum.LITERATURE_REVIEW, student);

        assertEquals(TaskStateEnum.LITERATURE_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("2. LITERATURE_REVIEW -> EXPERIMENTATION succeeds")
    void testLiteratureReviewToExperimentationSucceeds() {
        task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());
        task.transitionTo(state, TaskStateEnum.EXPERIMENTATION, student);

        assertEquals(TaskStateEnum.EXPERIMENTATION, task.getCurrentState());
    }

    @Test
    @DisplayName("3. EXPERIMENTATION -> UNDER_REVIEW succeeds")
    void testExperimentationToUnderReviewSucceeds() {
        task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
        TaskState state = stateFactory.getState(task.getCurrentState());
        task.transitionTo(state, TaskStateEnum.UNDER_REVIEW, student);

        assertEquals(TaskStateEnum.UNDER_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("4. UNDER_REVIEW -> APPROVED succeeds for SUPERVISOR")
    void testUnderReviewToApprovedSucceedsForSupervisor() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());
        task.transitionTo(state, TaskStateEnum.APPROVED, supervisor);

        assertEquals(TaskStateEnum.APPROVED, task.getCurrentState());
    }

    @Test
    @DisplayName("5. STUDENT attempting to approve a task fails with TaskAccessDeniedException")
    void testStudentCannotApproveTask() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        TaskAccessDeniedException ex = assertThrows(TaskAccessDeniedException.class, () ->
                task.transitionTo(state, TaskStateEnum.APPROVED, student)
        );

        assertTrue(ex.getMessage().contains("Students cannot approve tasks"));
        assertEquals(TaskStateEnum.UNDER_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("6. PROPOSED -> APPROVED directly fails with InvalidTaskTransitionException")
    void testProposedToApprovedFails() {
        task.setCurrentState(TaskStateEnum.PROPOSED);
        TaskState state = stateFactory.getState(task.getCurrentState());

        InvalidTaskTransitionException ex = assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.APPROVED, supervisor)
        );

        assertTrue(ex.getMessage().contains("cannot transition directly to APPROVED"));
        assertEquals(TaskStateEnum.PROPOSED, task.getCurrentState());
    }

    @Test
    @DisplayName("7. LITERATURE_REVIEW -> APPROVED directly fails with InvalidTaskTransitionException")
    void testLiteratureReviewToApprovedFails() {
        task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.APPROVED, supervisor)
        );
    }

    @Test
    @DisplayName("8. APPROVED state is terminal and cannot transition further")
    void testApprovedStateCannotTransition() {
        task.setCurrentState(TaskStateEnum.APPROVED);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.PROPOSED, supervisor)
        );
        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.UNDER_REVIEW, supervisor)
        );
    }

    @Test
    @DisplayName("9. STUDENT cannot send LITERATURE_REVIEW backward to PROPOSED")
    void testStudentCannotSendLitReviewBackToProposed() {
        task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        TaskAccessDeniedException ex = assertThrows(TaskAccessDeniedException.class, () ->
                task.transitionTo(state, TaskStateEnum.PROPOSED, student)
        );

        assertTrue(ex.getMessage().contains("supervisor"));
        assertEquals(TaskStateEnum.LITERATURE_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("10. SUPERVISOR can send LITERATURE_REVIEW backward to PROPOSED")
    void testSupervisorCanSendLitReviewBackToProposed() {
        task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        task.transitionTo(state, TaskStateEnum.PROPOSED, supervisor);

        assertEquals(TaskStateEnum.PROPOSED, task.getCurrentState());
    }

    @Test
    @DisplayName("11. STUDENT cannot send EXPERIMENTATION backward to LITERATURE_REVIEW")
    void testStudentCannotSendExperimentationBack() {
        task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(TaskAccessDeniedException.class, () ->
                task.transitionTo(state, TaskStateEnum.LITERATURE_REVIEW, student)
        );

        assertEquals(TaskStateEnum.EXPERIMENTATION, task.getCurrentState());
    }

    @Test
    @DisplayName("12. SUPERVISOR can send EXPERIMENTATION backward to LITERATURE_REVIEW")
    void testSupervisorCanSendExperimentationBack() {
        task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
        TaskState state = stateFactory.getState(task.getCurrentState());

        task.transitionTo(state, TaskStateEnum.LITERATURE_REVIEW, supervisor);

        assertEquals(TaskStateEnum.LITERATURE_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("13. STUDENT cannot send UNDER_REVIEW backward to EXPERIMENTATION")
    void testStudentCannotSendUnderReviewBack() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(TaskAccessDeniedException.class, () ->
                task.transitionTo(state, TaskStateEnum.EXPERIMENTATION, student)
        );

        assertEquals(TaskStateEnum.UNDER_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("14. SUPERVISOR can send UNDER_REVIEW backward to EXPERIMENTATION")
    void testSupervisorCanSendUnderReviewBack() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        task.transitionTo(state, TaskStateEnum.EXPERIMENTATION, supervisor);

        assertEquals(TaskStateEnum.EXPERIMENTATION, task.getCurrentState());
    }

    @Test
    @DisplayName("15. Skip: PROPOSED -> EXPERIMENTATION fails (InvalidTaskTransitionException)")
    void testProposedToExperimentationSkipFails() {
        task.setCurrentState(TaskStateEnum.PROPOSED);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.EXPERIMENTATION, student)
        );

        assertEquals(TaskStateEnum.PROPOSED, task.getCurrentState());
    }

    @Test
    @DisplayName("16. Skip: PROPOSED -> UNDER_REVIEW fails (InvalidTaskTransitionException)")
    void testProposedToUnderReviewSkipFails() {
        task.setCurrentState(TaskStateEnum.PROPOSED);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.UNDER_REVIEW, student)
        );

        assertEquals(TaskStateEnum.PROPOSED, task.getCurrentState());
    }

    @Test
    @DisplayName("17. Skip: LITERATURE_REVIEW -> UNDER_REVIEW fails (InvalidTaskTransitionException)")
    void testLiteratureReviewToUnderReviewSkipFails() {
        task.setCurrentState(TaskStateEnum.LITERATURE_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.UNDER_REVIEW, student)
        );

        assertEquals(TaskStateEnum.LITERATURE_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("18. Skip: EXPERIMENTATION -> APPROVED directly fails (InvalidTaskTransitionException)")
    void testExperimentationToApprovedSkipFails() {
        task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.APPROVED, supervisor)
        );

        assertEquals(TaskStateEnum.EXPERIMENTATION, task.getCurrentState());
    }

    @Test
    @DisplayName("19. Invalid backward: UNDER_REVIEW -> LITERATURE_REVIEW fails (InvalidTaskTransitionException)")
    void testUnderReviewToLiteratureReviewFails() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.LITERATURE_REVIEW, supervisor)
        );

        assertEquals(TaskStateEnum.UNDER_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("20. Invalid backward: UNDER_REVIEW -> PROPOSED fails (InvalidTaskTransitionException)")
    void testUnderReviewToProposedFails() {
        task.setCurrentState(TaskStateEnum.UNDER_REVIEW);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.PROPOSED, supervisor)
        );

        assertEquals(TaskStateEnum.UNDER_REVIEW, task.getCurrentState());
    }

    @Test
    @DisplayName("21. Invalid backward: EXPERIMENTATION -> PROPOSED fails (InvalidTaskTransitionException)")
    void testExperimentationToProposedFails() {
        task.setCurrentState(TaskStateEnum.EXPERIMENTATION);
        TaskState state = stateFactory.getState(task.getCurrentState());

        assertThrows(InvalidTaskTransitionException.class, () ->
                task.transitionTo(state, TaskStateEnum.PROPOSED, supervisor)
        );

        assertEquals(TaskStateEnum.EXPERIMENTATION, task.getCurrentState());
    }
}
