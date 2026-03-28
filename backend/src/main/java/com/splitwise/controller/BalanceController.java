package com.splitwise.controller;

import com.splitwise.dto.response.BalanceResponse;
import com.splitwise.dto.response.SimplifiedDebtResponse;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.BalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/balances")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;

    @GetMapping
    public ResponseEntity<List<BalanceResponse>> getBalances(@PathVariable Long groupId,
                                                              @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(balanceService.getPairwiseBalances(groupId, principal.getId()));
    }

    @GetMapping("/simplified")
    public ResponseEntity<List<SimplifiedDebtResponse>> getSimplified(@PathVariable Long groupId,
                                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(balanceService.getSimplifiedDebts(groupId, principal.getId()));
    }

    @GetMapping("/me")
    public ResponseEntity<List<BalanceResponse>> getMyBalances(@PathVariable Long groupId,
                                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(balanceService.getMyBalances(groupId, principal.getId()));
    }
}
