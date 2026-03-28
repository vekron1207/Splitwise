package com.splitwise.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AttachmentResponse {
    private Long id;
    private String originalName;
    private String contentType;
    private Long fileSize;
    private String downloadUrl;
    private UserSummary uploadedBy;
    private LocalDateTime uploadedAt;
}
