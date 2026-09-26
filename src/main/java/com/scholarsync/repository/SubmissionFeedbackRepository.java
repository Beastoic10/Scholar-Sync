package com.scholarsync.repository;

import com.scholarsync.entity.SubmissionFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionFeedbackRepository extends JpaRepository<SubmissionFeedback, Long> {

    @Query("SELECT f FROM SubmissionFeedback f " +
           "LEFT JOIN FETCH f.supervisor " +
           "WHERE f.submission.id = :submissionId " +
           "ORDER BY f.createdAt ASC")
    List<SubmissionFeedback> findBySubmissionIdWithSupervisor(@Param("submissionId") Long submissionId);
}
