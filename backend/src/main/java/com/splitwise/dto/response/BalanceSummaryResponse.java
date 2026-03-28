package com.splitwise.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BalanceSummaryResponse {
    private BigDecimal totalOwed;   // others owe me
    private BigDecimal totalOwe;    // I owe others
    private BigDecimal netBalance;  // positive = I'm owed overall
}
