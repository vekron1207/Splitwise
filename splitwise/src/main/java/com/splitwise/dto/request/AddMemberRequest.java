package com.splitwise.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddMemberRequest {

    @Email(message = "Invalid email address")
    @NotBlank(message = "Email is required")
    private String email;
}
