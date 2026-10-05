package com.scholarsync.repository;

import com.scholarsync.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m " +
           "JOIN FETCH m.sender " +
           "JOIN FETCH m.chat c " +
           "JOIN FETCH c.task t " +
           "WHERE c.id = :chatId " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findByChatIdOrderByCreatedAtAsc(@Param("chatId") Long chatId);

    long countByChatId(Long chatId);
}
