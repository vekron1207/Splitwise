package com.splitwise.controller;

import com.splitwise.dto.request.SettleDebtRequest;
import com.splitwise.dto.response.SettlementResponse;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @PostMapping
    public ResponseEntity<SettlementResponse> recordSettlement(@PathVariable Long groupId,
                                                                @Valid @RequestBody SettleDebtRequest request,
                                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(settlementService.recordSettlement(groupId, request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<List<SettlementResponse>> getSettlements(@PathVariable Long groupId,
                                                                    @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(settlementService.getSettlements(groupId, principal.getId()));
    }
}
