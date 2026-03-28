package com.splitwise.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MemberResponse {
    private Long id;
    private UserSummary user;
    private String role;
    private LocalDateTime joinedAt;
}
