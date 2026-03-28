package com.splitwise.controller;

import com.splitwise.dto.request.CreateExpenseRequest;
import com.splitwise.dto.response.ExpenseResponse;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/groups/{groupId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@PathVariable Long groupId,
                                                          @Valid @RequestBody CreateExpenseRequest request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenseService.createExpense(groupId, request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<Page<ExpenseResponse>> getExpenses(@PathVariable Long groupId,
                                                              @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
                                                              @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.getExpenses(groupId, principal.getId(), pageable));
    }

    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponse> getExpense(@PathVariable Long groupId,
                                                       @PathVariable Long expenseId,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.getExpenseById(groupId, expenseId, principal.getId()));
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponse> updateExpense(@PathVariable Long groupId,
                                                          @PathVariable Long expenseId,
                                                          @Valid @RequestBody CreateExpenseRequest request,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.updateExpense(groupId, expenseId, request, principal.getId()));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long groupId,
                                               @PathVariable Long expenseId,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        expenseService.deleteExpense(groupId, expenseId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
