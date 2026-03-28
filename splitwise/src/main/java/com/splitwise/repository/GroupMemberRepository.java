package com.splitwise.repository;

import com.splitwise.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    List<GroupMember> findAllByGroupId(Long groupId);
    void deleteByGroupIdAndUserId(Long groupId, Long userId);
    List<GroupMember> findAllByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM GroupMember gm WHERE gm.group.id = :groupId")
    void deleteAllByGroupId(@org.springframework.data.repository.query.Param("groupId") Long groupId);
}
