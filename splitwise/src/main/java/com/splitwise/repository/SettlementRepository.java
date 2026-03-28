package com.splitwise.repository;

import com.splitwise.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findAllByGroupId(Long groupId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Settlement s WHERE s.group.id = :groupId")
    void deleteAllByGroupId(@org.springframework.data.repository.query.Param("groupId") Long groupId);
}
