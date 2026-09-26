package com.scholarsync.repository;

import com.scholarsync.entity.ResearchSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResearchSubmissionRepository extends JpaRepository<ResearchSubmission, Long> {

    List<ResearchSubmission> findByTaskIdOrderByCreatedAtDesc(Long taskId);

    List<ResearchSubmission> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    @Query("SELECT s FROM ResearchSubmission s " +
           "LEFT JOIN FETCH s.task t " +
           "LEFT JOIN FETCH t.project p " +
           "LEFT JOIN FETCH s.submittedBy " +
           "LEFT JOIN FETCH s.feedbackList f " +
           "LEFT JOIN FETCH f.supervisor " +
           "WHERE s.id = :id")
    Optional<ResearchSubmission> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT s FROM ResearchSubmission s " +
           "LEFT JOIN FETCH s.task t " +
           "LEFT JOIN FETCH t.project p " +
           "LEFT JOIN FETCH s.submittedBy " +
           "WHERE s.task.id = :taskId " +
           "ORDER BY s.createdAt ASC")
    List<ResearchSubmission> findByTaskIdWithDetails(@Param("taskId") Long taskId);

    Optional<ResearchSubmission> findByTaskIdAndVersionNumber(Long taskId, String versionNumber);

    boolean existsByTaskIdAndVersionNumber(Long taskId, String versionNumber);

    @Query("SELECT s.versionNumber FROM ResearchSubmission s WHERE s.task.id = :taskId")
    List<String> findVersionNumbersByTaskId(@Param("taskId") Long taskId);
}
