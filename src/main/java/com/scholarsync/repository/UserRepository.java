package com.scholarsync.repository;

import com.scholarsync.entity.Role;
import com.scholarsync.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    @Query("SELECT u FROM User u WHERE u.role = :role " +
           "AND (:query IS NULL OR :query = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY u.name ASC")
    List<User> searchByRoleAndName(@Param("role") Role role, @Param("query") String query);

    @Query("SELECT u FROM User u WHERE u.role = com.scholarsync.entity.Role.STUDENT " +
           "AND (:query IS NULL OR :query = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND u NOT IN (SELECT s FROM ResearchProject p JOIN p.students s WHERE p.id = :projectId) " +
           "ORDER BY u.name ASC")
    List<User> searchEligibleStudentsForProject(@Param("projectId") Long projectId, @Param("query") String query);
}

