package com.splitwise.service;

import com.splitwise.dto.request.SettleDebtRequest;
import com.splitwise.dto.response.SettlementResponse;
import com.splitwise.dto.response.UserSummary;
import com.splitwise.entity.Group;
import com.splitwise.entity.Settlement;
import com.splitwise.entity.User;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    public SettlementResponse recordSettlement(Long groupId, SettleDebtRequest request, Long requesterId) {
        groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        User paidBy = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User paidTo = userRepository.findById(request.getPaidTo())
                .orElseThrow(() -> new ResourceNotFoundException("Recipient user not found"));

        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, paidTo.getId())) {
            throw new UnauthorizedException("Recipient is not a member of this group");
        }

        Settlement settlement = Settlement.builder()
                .group(group)
                .paidBy(paidBy)
                .paidTo(paidTo)
                .amount(request.getAmount())
                .note(request.getNote())
                .build();
        settlementRepository.save(settlement);

        return toResponse(settlement);
    }

    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlements(Long groupId, Long requesterId) {
        groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));
        return settlementRepository.findAllByGroupId(groupId).stream()
                .map(this::toResponse)
                .toList();
    }

    private SettlementResponse toResponse(Settlement s) {
        return SettlementResponse.builder()
                .id(s.getId())
                .groupId(s.getGroup().getId())
                .paidBy(UserSummary.builder()
                        .id(s.getPaidBy().getId())
                        .name(s.getPaidBy().getName())
                        .email(s.getPaidBy().getEmail())
                        .build())
                .paidTo(UserSummary.builder()
                        .id(s.getPaidTo().getId())
                        .name(s.getPaidTo().getName())
                        .email(s.getPaidTo().getEmail())
                        .build())
                .amount(s.getAmount())
                .note(s.getNote())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
