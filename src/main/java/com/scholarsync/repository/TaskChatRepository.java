package com.scholarsync.repository;

import com.scholarsync.entity.TaskChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaskChatRepository extends JpaRepository<TaskChat, Long> {

    @Query("SELECT c FROM TaskChat c " +
           "LEFT JOIN FETCH c.task t " +
           "LEFT JOIN FETCH t.project p " +
           "LEFT JOIN FETCH p.supervisor " +
           "LEFT JOIN FETCH c.participants " +
           "WHERE t.id = :taskId")
    Optional<TaskChat> findByTaskIdWithDetails(@Param("taskId") Long taskId);

    Optional<TaskChat> findByTaskId(Long taskId);

    boolean existsByTaskId(Long taskId);
}
