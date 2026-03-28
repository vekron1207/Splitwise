package com.splitwise.repository;

import com.splitwise.entity.Split;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SplitRepository extends JpaRepository<Split, Long> {
    List<Split> findAllByExpenseId(Long expenseId);
    List<Split> findAllByExpense_GroupIdAndExpense_DeletedFalse(Long groupId);

    @Modifying
    @Query("DELETE FROM Split s WHERE s.expense.id = :expenseId")
    void deleteAllByExpenseId(@Param("expenseId") Long expenseId);

    @Modifying
    @Query("DELETE FROM Split s WHERE s.expense.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
}
