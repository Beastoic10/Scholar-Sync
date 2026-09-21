package com.scholarsync.repository;

import com.scholarsync.entity.ResearchTask;
import com.scholarsync.entity.TaskStateEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResearchTaskRepository extends JpaRepository<ResearchTask, Long> {

    @Query("SELECT t FROM ResearchTask t " +
           "LEFT JOIN FETCH t.project p " +
           "LEFT JOIN FETCH t.assignedStudent " +
           "WHERE t.project.id = :projectId " +
           "ORDER BY t.createdAt ASC")
    List<ResearchTask> findByProjectIdWithDetails(@Param("projectId") Long projectId);

    @Query("SELECT t FROM ResearchTask t " +
           "JOIN FETCH t.project p " +
           "JOIN FETCH p.supervisor " +
           "LEFT JOIN FETCH p.students " +
           "LEFT JOIN FETCH t.assignedStudent " +
           "WHERE t.id = :id")
    Optional<ResearchTask> findByIdWithDetails(@Param("id") Long id);

    List<ResearchTask> findByProjectIdAndCurrentState(Long projectId, TaskStateEnum state);
}
