package com.splitwise.service;

import com.splitwise.dto.request.CreateExpenseRequest;
import com.splitwise.dto.request.SplitRequest;
import com.splitwise.dto.response.AttachmentResponse;
import com.splitwise.dto.response.ExpenseResponse;
import com.splitwise.dto.response.SplitResponse;
import com.splitwise.dto.response.UserSummary;
import com.splitwise.entity.Expense;
import com.splitwise.entity.Group;
import com.splitwise.entity.Split;
import com.splitwise.entity.User;
import com.splitwise.exception.InvalidSplitException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.AttachmentRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.SplitRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final SplitRepository splitRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;

    public ExpenseResponse createExpense(Long groupId, CreateExpenseRequest request, Long creatorId) {
        validateMembership(groupId, creatorId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        Long payerId = request.getPaidBy() != null ? request.getPaidBy() : creatorId;
        User paidBy = userRepository.findById(payerId)
                .orElseThrow(() -> new ResourceNotFoundException("Payer not found"));
        validateMembership(groupId, paidBy.getId());

        Expense expense = Expense.builder()
                .group(group)
                .paidBy(paidBy)
                .title(request.getTitle())
                .description(request.getDescription())
                .amount(request.getAmount())
                .splitType(request.getSplitType())
                .category(request.getCategory())
                .build();
        expenseRepository.save(expense);

        List<Split> splits = calculateSplits(expense, request);
        splitRepository.saveAll(splits);

        return toExpenseResponse(expense, splits);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> getExpenses(Long groupId, Long requesterId, Pageable pageable) {
        validateMembership(groupId, requesterId);
        return expenseRepository.findAllByGroupIdAndDeletedFalse(groupId, pageable)
                .map(e -> toExpenseResponse(e, splitRepository.findAllByExpenseId(e.getId())));
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long groupId, Long expenseId, Long requesterId) {
        validateMembership(groupId, requesterId);
        Expense expense = expenseRepository.findByIdAndDeletedFalse(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return toExpenseResponse(expense, splitRepository.findAllByExpenseId(expenseId));
    }

    public ExpenseResponse updateExpense(Long groupId, Long expenseId, CreateExpenseRequest request, Long requesterId) {
        validateMembership(groupId, requesterId);
        Expense expense = expenseRepository.findByIdAndDeletedFalse(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        boolean isPayerOrAdmin = expense.getPaidBy().getId().equals(requesterId) ||
                groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                        .map(m -> m.getRole().name().equals("ADMIN"))
                        .orElse(false);
        if (!isPayerOrAdmin) {
            throw new UnauthorizedException("Only the payer or an admin can edit this expense");
        }

        Long payerId = request.getPaidBy() != null ? request.getPaidBy() : requesterId;
        User paidBy = userRepository.findById(payerId)
                .orElseThrow(() -> new ResourceNotFoundException("Payer not found"));

        expense.setPaidBy(paidBy);
        expense.setTitle(request.getTitle());
        expense.setDescription(request.getDescription());
        expense.setAmount(request.getAmount());
        expense.setSplitType(request.getSplitType());
        expense.setCategory(request.getCategory());
        expenseRepository.save(expense);

        splitRepository.deleteAllByExpenseId(expenseId);
        List<Split> splits = calculateSplits(expense, request);
        splitRepository.saveAll(splits);

        return toExpenseResponse(expense, splits);
    }

    public void deleteExpense(Long groupId, Long expenseId, Long requesterId) {
        validateMembership(groupId, requesterId);
        Expense expense = expenseRepository.findByIdAndDeletedFalse(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        boolean isPayerOrAdmin = expense.getPaidBy().getId().equals(requesterId) ||
                groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                        .map(m -> m.getRole().name().equals("ADMIN"))
                        .orElse(false);
        if (!isPayerOrAdmin) {
            throw new UnauthorizedException("Only the payer or an admin can delete this expense");
        }

        expense.setDeleted(true);
        expenseRepository.save(expense);
    }

    // -------------------------------------------------------------------------
    // Split calculation
    // -------------------------------------------------------------------------

    private List<Split> calculateSplits(Expense expense, CreateExpenseRequest request) {
        return switch (expense.getSplitType()) {
            case EQUAL -> calculateEqualSplits(expense, request.getSplits());
            case EXACT -> calculateExactSplits(expense, request.getSplits());
            case PERCENTAGE -> calculatePercentageSplits(expense, request.getSplits());
        };
    }

    private List<Split> calculateEqualSplits(Expense expense, List<SplitRequest> splitRequests) {
        int n = splitRequests.size();
        BigDecimal share = expense.getAmount().divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal remainder = expense.getAmount().subtract(share.multiply(BigDecimal.valueOf(n)));

        List<Split> splits = new ArrayList<>();
        for (int i = 0; i < splitRequests.size(); i++) {
            User user = resolveUser(splitRequests.get(i).getUserId());
            BigDecimal amount = (i == 0) ? share.add(remainder) : share;
            splits.add(Split.builder().expense(expense).user(user).amount(amount).build());
        }
        return splits;
    }

    private List<Split> calculateExactSplits(Expense expense, List<SplitRequest> splitRequests) {
        BigDecimal total = splitRequests.stream()
                .map(SplitRequest::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(expense.getAmount()) != 0) {
            throw new InvalidSplitException(
                    "Split amounts must sum to " + expense.getAmount() + " but got " + total);
        }
        List<Split> splits = new ArrayList<>();
        for (SplitRequest sr : splitRequests) {
            splits.add(Split.builder()
                    .expense(expense)
                    .user(resolveUser(sr.getUserId()))
                    .amount(sr.getAmount())
                    .build());
        }
        return splits;
    }

    private List<Split> calculatePercentageSplits(Expense expense, List<SplitRequest> splitRequests) {
        BigDecimal totalPct = splitRequests.stream()
                .map(SplitRequest::getPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPct.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw new InvalidSplitException("Percentages must sum to 100 but got " + totalPct);
        }
        List<Split> splits = new ArrayList<>();
        BigDecimal running = BigDecimal.ZERO;
        for (int i = 0; i < splitRequests.size(); i++) {
            SplitRequest sr = splitRequests.get(i);
            BigDecimal amount;
            if (i == splitRequests.size() - 1) {
                amount = expense.getAmount().subtract(running);
            } else {
                amount = expense.getAmount()
                        .multiply(sr.getPercentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
                running = running.add(amount);
            }
            splits.add(Split.builder()
                    .expense(expense)
                    .user(resolveUser(sr.getUserId()))
                    .amount(amount)
                    .percentage(sr.getPercentage())
                    .build());
        }
        return splits;
    }

    private User resolveUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private void validateMembership(Long groupId, Long userId) {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this group"));
    }

    // -------------------------------------------------------------------------
    // Mapping
    // -------------------------------------------------------------------------

    private ExpenseResponse toExpenseResponse(Expense expense, List<Split> splits) {
        List<SplitResponse> splitResponses = splits.stream()
                .map(s -> SplitResponse.builder()
                        .userId(s.getUser().getId())
                        .userName(s.getUser().getName())
                        .amount(s.getAmount())
                        .percentage(s.getPercentage())
                        .build())
                .toList();

        List<AttachmentResponse> attachments = attachmentRepository.findAllByExpenseId(expense.getId())
                .stream()
                .map(a -> AttachmentResponse.builder()
                        .id(a.getId())
                        .originalName(a.getOriginalName())
                        .contentType(a.getContentType())
                        .fileSize(a.getFileSize())
                        .downloadUrl("/api/attachments/" + a.getId())
                        .uploadedBy(UserSummary.builder()
                                .id(a.getUploadedBy().getId())
                                .name(a.getUploadedBy().getName())
                                .email(a.getUploadedBy().getEmail())
                                .build())
                        .uploadedAt(a.getUploadedAt())
                        .build())
                .toList();

        return ExpenseResponse.builder()
                .id(expense.getId())
                .groupId(expense.getGroup().getId())
                .paidBy(UserSummary.builder()
                        .id(expense.getPaidBy().getId())
                        .name(expense.getPaidBy().getName())
                        .email(expense.getPaidBy().getEmail())
                        .build())
                .title(expense.getTitle())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .splitType(expense.getSplitType())
                .category(expense.getCategory())
                .splits(splitResponses)
                .attachments(attachments)
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }
}
