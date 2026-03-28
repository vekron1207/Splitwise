package com.splitwise.dto.request;

import com.splitwise.enums.ExpenseCategory;
import com.splitwise.enums.SplitType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateExpenseRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @NotNull(message = "Split type is required")
    private SplitType splitType;

    private ExpenseCategory category;

    // Optional: defaults to the authenticated user if not provided
    private Long paidBy;

    @NotEmpty(message = "At least one split is required")
    @Valid
    private List<SplitRequest> splits;
}
