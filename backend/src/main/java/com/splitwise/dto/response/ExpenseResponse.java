package com.splitwise.dto.response;

import com.splitwise.enums.ExpenseCategory;
import com.splitwise.enums.SplitType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExpenseResponse {
    private Long id;
    private Long groupId;
    private UserSummary paidBy;
    private String title;
    private String description;
    private BigDecimal amount;
    private SplitType splitType;
    private ExpenseCategory category;
    private List<SplitResponse> splits;
    private List<AttachmentResponse> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
