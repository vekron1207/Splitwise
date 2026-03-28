package com.splitwise.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class SettlementResponse {
    private Long id;
    private Long groupId;
    private UserSummary paidBy;
    private UserSummary paidTo;
    private BigDecimal amount;
    private String note;
    private LocalDateTime createdAt;
}
