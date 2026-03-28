package com.splitwise.repository;

import com.splitwise.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findAllByExpenseId(Long expenseId);
    void deleteAllByExpenseId(Long expenseId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Attachment a WHERE a.expense.group.id = :groupId")
    void deleteAllByGroupId(@org.springframework.data.repository.query.Param("groupId") Long groupId);
}
