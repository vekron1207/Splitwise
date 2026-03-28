package com.splitwise.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GroupResponse {
    private Long id;
    private String name;
    private String description;
    private UserSummary createdBy;
    private List<MemberResponse> members;
    private LocalDateTime createdAt;
}
