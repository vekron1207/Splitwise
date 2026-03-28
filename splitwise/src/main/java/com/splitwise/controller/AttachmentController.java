package com.splitwise.controller;

import com.splitwise.dto.response.AttachmentResponse;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping("/api/groups/{groupId}/expenses/{expenseId}/attachments")
    public ResponseEntity<AttachmentResponse> upload(
            @PathVariable Long groupId,
            @PathVariable Long expenseId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        return ResponseEntity.ok(attachmentService.upload(groupId, expenseId, file, principal.getId()));
    }

    @GetMapping("/api/groups/{groupId}/expenses/{expenseId}/attachments")
    public ResponseEntity<List<AttachmentResponse>> list(
            @PathVariable Long groupId,
            @PathVariable Long expenseId) {
        return ResponseEntity.ok(attachmentService.getForExpense(expenseId));
    }

    @GetMapping("/api/attachments/{id}")
    public ResponseEntity<Resource> download(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        Resource resource = attachmentService.download(id, principal.getId());
        String contentType = attachmentService.getContentType(id);
        String originalName = attachmentService.getOriginalName(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(originalName).build().toString())
                .body(resource);
    }

    @DeleteMapping("/api/attachments/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        attachmentService.delete(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
