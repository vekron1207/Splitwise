package com.splitwise.repository;

import com.splitwise.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE LOWER(u.name) LIKE %:term% OR LOWER(u.email) LIKE %:term%")
    List<User> searchByNameOrEmail(@Param("term") String term);
}
