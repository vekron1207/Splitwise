package com.splitwise.service;

import com.splitwise.dto.response.BalanceResponse;
import com.splitwise.dto.response.SimplifiedDebtResponse;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.Settlement;
import com.splitwise.entity.Split;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.SettlementRepository;
import com.splitwise.repository.SplitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BalanceService {

    private final SplitRepository splitRepository;
    private final SettlementRepository settlementRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final DebtSimplificationService debtSimplificationService;

    public List<BalanceResponse> getPairwiseBalances(Long groupId, Long requesterId) {
        validateMembership(groupId, requesterId);

        Map<Long, String> userNames = getUserNames(groupId);

        // owe[a][b] = amount a owes b
        Map<Long, Map<Long, BigDecimal>> owe = new HashMap<>();

        for (Split split : splitRepository.findAllByExpense_GroupIdAndExpense_DeletedFalse(groupId)) {
            Long debtorId = split.getUser().getId();
            Long creditorId = split.getExpense().getPaidBy().getId();
            if (!debtorId.equals(creditorId)) {
                owe.computeIfAbsent(debtorId, k -> new HashMap<>())
                        .merge(creditorId, split.getAmount(), BigDecimal::add);
            }
        }

        for (Settlement settlement : settlementRepository.findAllByGroupId(groupId)) {
            Long payerId = settlement.getPaidBy().getId();
            Long receiverId = settlement.getPaidTo().getId();
            // payer settling reduces their debt to receiver
            owe.computeIfAbsent(payerId, k -> new HashMap<>())
                    .merge(receiverId, settlement.getAmount().negate(), BigDecimal::add);
        }

        List<BalanceResponse> result = new ArrayList<>();
        Set<String> processed = new HashSet<>();

        for (Map.Entry<Long, Map<Long, BigDecimal>> debtorEntry : owe.entrySet()) {
            Long aId = debtorEntry.getKey();
            for (Long bId : debtorEntry.getValue().keySet()) {
                String key = Math.min(aId, bId) + "-" + Math.max(aId, bId);
                if (!processed.add(key)) continue;

                BigDecimal aOwesB = owe.getOrDefault(aId, Map.of()).getOrDefault(bId, BigDecimal.ZERO);
                BigDecimal bOwesA = owe.getOrDefault(bId, Map.of()).getOrDefault(aId, BigDecimal.ZERO);
                BigDecimal net = aOwesB.subtract(bOwesA);

                if (net.compareTo(BigDecimal.ZERO) > 0) {
                    result.add(balance(aId, bId, net, userNames));
                } else if (net.compareTo(BigDecimal.ZERO) < 0) {
                    result.add(balance(bId, aId, net.negate(), userNames));
                }
            }
        }

        return result;
    }

    public List<SimplifiedDebtResponse> getSimplifiedDebts(Long groupId, Long requesterId) {
        validateMembership(groupId, requesterId);
        Map<Long, String> userNames = getUserNames(groupId);
        Map<Long, BigDecimal> netBalances = computeNetBalances(groupId);
        return debtSimplificationService.simplify(netBalances, userNames);
    }

    public List<BalanceResponse> getMyBalances(Long groupId, Long requesterId) {
        return getPairwiseBalances(groupId, requesterId).stream()
                .filter(b -> b.getFromUserId().equals(requesterId) || b.getToUserId().equals(requesterId))
                .toList();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Computes per-user net balance:
     * positive = net creditor (is owed money), negative = net debtor (owes money).
     */
    public Map<Long, BigDecimal> computeNetBalances(Long groupId) {
        Map<Long, BigDecimal> net = new HashMap<>();

        for (Split split : splitRepository.findAllByExpense_GroupIdAndExpense_DeletedFalse(groupId)) {
            Long debtorId = split.getUser().getId();
            Long creditorId = split.getExpense().getPaidBy().getId();
            if (!debtorId.equals(creditorId)) {
                net.merge(creditorId, split.getAmount(), BigDecimal::add);
                net.merge(debtorId, split.getAmount().negate(), BigDecimal::add);
            }
        }

        for (Settlement settlement : settlementRepository.findAllByGroupId(groupId)) {
            Long payerId = settlement.getPaidBy().getId();
            Long receiverId = settlement.getPaidTo().getId();
            net.merge(payerId, settlement.getAmount(), BigDecimal::add);
            net.merge(receiverId, settlement.getAmount().negate(), BigDecimal::add);
        }

        return net;
    }

    private Map<Long, String> getUserNames(Long groupId) {
        Map<Long, String> names = new HashMap<>();
        for (GroupMember gm : groupMemberRepository.findAllByGroupId(groupId)) {
            names.put(gm.getUser().getId(), gm.getUser().getName());
        }
        return names;
    }

    private void validateMembership(Long groupId, Long userId) {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));
    }

    private BalanceResponse balance(Long fromId, Long toId, BigDecimal amount,
                                    Map<Long, String> userNames) {
        return BalanceResponse.builder()
                .fromUserId(fromId)
                .fromUserName(userNames.getOrDefault(fromId, "Unknown"))
                .toUserId(toId)
                .toUserName(userNames.getOrDefault(toId, "Unknown"))
                .amount(amount)
                .build();
    }
}
