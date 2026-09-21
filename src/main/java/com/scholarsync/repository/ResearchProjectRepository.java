package com.scholarsync.repository;

import com.scholarsync.entity.ResearchProject;
import com.scholarsync.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResearchProjectRepository extends JpaRepository<ResearchProject, Long> {

    @Query("SELECT DISTINCT p FROM ResearchProject p " +
           "LEFT JOIN FETCH p.supervisor " +
           "WHERE p.supervisor = :supervisor " +
           "ORDER BY p.createdAt DESC")
    List<ResearchProject> findBySupervisor(@Param("supervisor") User supervisor);

    @Query("SELECT DISTINCT p FROM ResearchProject p " +
           "LEFT JOIN FETCH p.supervisor " +
           "JOIN p.students s " +
           "WHERE s = :student " +
           "ORDER BY p.createdAt DESC")
    List<ResearchProject> findByStudent(@Param("student") User student);

    @Query("SELECT p FROM ResearchProject p " +
           "LEFT JOIN FETCH p.supervisor " +
           "LEFT JOIN FETCH p.students " +
           "WHERE p.id = :id")
    Optional<ResearchProject> findByIdWithDetails(@Param("id") Long id);
}
