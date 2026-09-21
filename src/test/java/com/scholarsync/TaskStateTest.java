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
    }
}
