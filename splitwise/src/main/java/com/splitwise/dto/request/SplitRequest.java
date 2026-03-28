package com.splitwise.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SplitRequest {

    @NotNull(message = "User ID is required in each split")
    private Long userId;

    // For EXACT split type
    private BigDecimal amount;

    // For PERCENTAGE split type
    private BigDecimal percentage;
}
