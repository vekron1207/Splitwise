package com.splitwise.service;

import com.splitwise.dto.request.AddMemberRequest;
import com.splitwise.dto.request.CreateGroupRequest;
import com.splitwise.dto.response.GroupResponse;
import com.splitwise.dto.response.MemberResponse;
import com.splitwise.dto.response.UserSummary;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.User;
import com.splitwise.enums.GroupRole;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.AttachmentRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.SplitRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final SplitRepository splitRepository;

    public GroupResponse createGroup(CreateGroupRequest request, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(creator)
                .build();
        groupRepository.save(group);

        GroupMember admin = GroupMember.builder()
                .group(group)
                .user(creator)
                .role(GroupRole.ADMIN)
                .build();
        groupMemberRepository.save(admin);

        return toGroupResponse(group);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> getGroupsForUser(Long userId) {
        return groupRepository.findAllByMemberId(userId).stream()
                .map(this::toGroupResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroupById(Long groupId, Long requesterId) {
        validateMembership(groupId, requesterId);
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        return toGroupResponse(group);
    }

    public GroupResponse updateGroup(Long groupId, CreateGroupRequest request, Long requesterId) {
        validateAdmin(groupId, requesterId);
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        group.setName(request.getName());
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription());
        }
        groupRepository.save(group);
        return toGroupResponse(group);
    }

    public void deleteGroup(Long groupId, Long requesterId) {
        validateAdmin(groupId, requesterId);
        attachmentRepository.deleteAllByGroupId(groupId);
        splitRepository.deleteAllByGroupId(groupId);
        expenseRepository.deleteAllByGroupId(groupId);
        settlementRepository.deleteAllByGroupId(groupId);
        groupMemberRepository.deleteAllByGroupId(groupId);
        groupRepository.deleteById(groupId);
    }

    public GroupResponse addMember(Long groupId, AddMemberRequest request, Long requesterId) {
        validateAdmin(groupId, requesterId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        User newMember = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No user found with email: " + request.getEmail()));

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, newMember.getId())) {
            throw new IllegalStateException("User is already a member of this group");
        }

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(newMember)
                .role(GroupRole.MEMBER)
                .build();
        groupMemberRepository.save(member);

        return toGroupResponse(group);
    }

    public void removeMember(Long groupId, Long targetUserId, Long requesterId) {
        validateAdmin(groupId, requesterId);
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, targetUserId)) {
            throw new ResourceNotFoundException("Member not found in this group");
        }
        groupMemberRepository.deleteByGroupIdAndUserId(groupId, targetUserId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validateMembership(Long groupId, Long userId) {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));
    }

    private void validateAdmin(Long groupId, Long userId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));
        if (member.getRole() != GroupRole.ADMIN) {
            throw new UnauthorizedException("Only group admins can perform this action");
        }
    }

    private GroupResponse toGroupResponse(Group group) {
        List<MemberResponse> members = groupMemberRepository.findAllByGroupId(group.getId()).stream()
                .map(gm -> MemberResponse.builder()
                        .id(gm.getId())
                        .user(UserSummary.builder()
                                .id(gm.getUser().getId())
                                .name(gm.getUser().getName())
                                .email(gm.getUser().getEmail())
                                .build())
                        .role(gm.getRole().name())
                        .joinedAt(gm.getJoinedAt())
                        .build())
                .toList();

        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdBy(UserSummary.builder()
                        .id(group.getCreatedBy().getId())
                        .name(group.getCreatedBy().getName())
                        .email(group.getCreatedBy().getEmail())
                        .build())
                .members(members)
                .createdAt(group.getCreatedAt())
                .build();
    }
}
