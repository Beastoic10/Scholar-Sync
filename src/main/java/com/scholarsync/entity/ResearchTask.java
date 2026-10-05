package com.scholarsync.entity;

import com.scholarsync.state.TaskState;
import jakarta.persistence.*;
import lombok.*;

import java.util.Objects;

@Entity
@Table(name = "research_tasks", indexes = {
    @Index(name = "idx_tasks_project", columnList = "project_id"),
    @Index(name = "idx_tasks_student", columnList = "assigned_student_id"),
    @Index(name = "idx_tasks_state", columnList = "current_state")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchTask extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ResearchProject project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_student_id")
    private User assignedStudent;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "task_assigned_students",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "student_id")
    )
    private java.util.Set<User> assignedStudents = new java.util.HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "current_state", nullable = false, length = 30)
    @Builder.Default
    private TaskStateEnum currentState = TaskStateEnum.PROPOSED;

    public void addAssignedStudent(User student) {
        if (student != null) {
            if (this.assignedStudents == null) {
                this.assignedStudents = new java.util.HashSet<>();
            }
            this.assignedStudents.add(student);
            if (this.assignedStudent == null) {
                this.assignedStudent = student;
            }
        }
    }

    public void removeAssignedStudent(User student) {
        if (student != null && this.assignedStudents != null) {
            this.assignedStudents.remove(student);
            if (this.assignedStudent != null && this.assignedStudent.getId().equals(student.getId())) {
                this.assignedStudent = this.assignedStudents.isEmpty() ? null : this.assignedStudents.iterator().next();
            }
        }
    }

    @OneToOne(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private TaskChat chat;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<ResearchSubmission> submissions = new java.util.ArrayList<>();

    public void transitionTo(TaskState currentStateHandler, TaskStateEnum targetState, User currentUser) {
        currentStateHandler.transition(this, targetState, currentUser);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ResearchTask that = (ResearchTask) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
