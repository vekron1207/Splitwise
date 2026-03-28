package com.splitwise.controller;

import com.splitwise.dto.response.BalanceSummaryResponse;
import com.splitwise.dto.response.UserSummary;
import com.splitwise.entity.User;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.UserRepository;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.BalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final BalanceService balanceService;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    /**
     * Aggregates balances across all groups the current user belongs to.
     */
    @GetMapping("/balance-summary")
    public ResponseEntity<BalanceSummaryResponse> getBalanceSummary(
            @AuthenticationPrincipal UserPrincipal principal) {

        Long userId = principal.getId();
        BigDecimal totalOwed = BigDecimal.ZERO;  // others owe me
        BigDecimal totalOwe  = BigDecimal.ZERO;  // I owe others

        List<Long> groupIds = groupMemberRepository.findAllByUserId(userId)
                .stream().map(gm -> gm.getGroup().getId()).toList();

        for (Long groupId : groupIds) {
            Map<Long, BigDecimal> net = balanceService.computeNetBalances(groupId);
            BigDecimal myNet = net.getOrDefault(userId, BigDecimal.ZERO);
            if (myNet.compareTo(BigDecimal.ZERO) > 0) {
                totalOwed = totalOwed.add(myNet);
            } else if (myNet.compareTo(BigDecimal.ZERO) < 0) {
                totalOwe = totalOwe.add(myNet.negate());
            }
        }

        return ResponseEntity.ok(BalanceSummaryResponse.builder()
                .totalOwed(totalOwed)
                .totalOwe(totalOwe)
                .netBalance(totalOwed.subtract(totalOwe))
                .build());
    }

    /**
     * Search registered users by name or email (for adding members / contacts).
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserSummary>> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }

        String term = q.trim().toLowerCase();
        List<User> results = userRepository.searchByNameOrEmail(term);

        List<UserSummary> summaries = results.stream()
                .filter(u -> !u.getId().equals(principal.getId())) // exclude self
                .limit(10)
                .map(u -> UserSummary.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .email(u.getEmail())
                        .build())
                .toList();

        return ResponseEntity.ok(summaries);
    }
}
