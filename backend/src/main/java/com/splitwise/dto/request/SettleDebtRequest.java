package com.splitwise.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SettleDebtRequest {

    @NotNull(message = "Recipient user ID is required")
    private Long paidTo;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @Size(max = 300, message = "Note must not exceed 300 characters")
    private String note;
}
