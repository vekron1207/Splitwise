package com.splitwise.repository;

import com.splitwise.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    Page<Expense> findAllByGroupIdAndDeletedFalse(Long groupId, Pageable pageable);
    Optional<Expense> findByIdAndDeletedFalse(Long id);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Expense e WHERE e.group.id = :groupId")
    void deleteAllByGroupId(@org.springframework.data.repository.query.Param("groupId") Long groupId);
}
