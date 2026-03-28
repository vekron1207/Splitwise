package com.splitwise.service;

import com.splitwise.dto.response.AttachmentResponse;
import com.splitwise.dto.response.UserSummary;
import com.splitwise.entity.Attachment;
import com.splitwise.entity.Expense;
import com.splitwise.entity.User;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.exception.UnauthorizedException;
import com.splitwise.repository.AttachmentRepository;
import com.splitwise.repository.ExpenseRepository;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public AttachmentResponse upload(Long groupId, Long expenseId, MultipartFile file, Long uploaderId) throws IOException {
        groupMemberRepository.findByGroupIdAndUserId(groupId, uploaderId)
                .orElseThrow(() -> new UnauthorizedException("Not a member of this group"));

        Expense expense = expenseRepository.findByIdAndDeletedFalse(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String ext = "";
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.'));
        }
        String storedName = UUID.randomUUID() + ext;

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);
        Files.copy(file.getInputStream(), uploadPath.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);

        Attachment attachment = Attachment.builder()
                .expense(expense)
                .uploadedBy(uploader)
                .originalName(originalName != null ? originalName : "file")
                .storedName(storedName)
                .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .build();

        attachment = attachmentRepository.save(attachment);
        return toResponse(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getForExpense(Long expenseId) {
        return attachmentRepository.findAllByExpenseId(expenseId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Resource download(Long attachmentId, Long requesterId) throws IOException {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));

        Long groupId = attachment.getExpense().getGroup().getId();
        groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .orElseThrow(() -> new UnauthorizedException("Not a member of this group"));

        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(attachment.getStoredName());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new ResourceNotFoundException("File not found on server");
        }
        return resource;
    }

    public void delete(Long attachmentId, Long requesterId) throws IOException {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));

        Long groupId = attachment.getExpense().getGroup().getId();
        boolean isOwner = attachment.getUploadedBy().getId().equals(requesterId);
        boolean isAdmin = groupMemberRepository.findByGroupIdAndUserId(groupId, requesterId)
                .map(m -> m.getRole().name().equals("ADMIN"))
                .orElse(false);

        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("Cannot delete this attachment");
        }

        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(attachment.getStoredName());
        Files.deleteIfExists(filePath);
        attachmentRepository.delete(attachment);
    }

    public String getContentType(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .map(Attachment::getContentType)
                .orElse("application/octet-stream");
    }

    public String getOriginalName(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .map(Attachment::getOriginalName)
                .orElse("file");
    }

    private AttachmentResponse toResponse(Attachment a) {
        return AttachmentResponse.builder()
                .id(a.getId())
                .originalName(a.getOriginalName())
                .contentType(a.getContentType())
                .fileSize(a.getFileSize())
                .downloadUrl("/api/attachments/" + a.getId())
                .uploadedBy(UserSummary.builder()
                        .id(a.getUploadedBy().getId())
                        .name(a.getUploadedBy().getName())
                        .email(a.getUploadedBy().getEmail())
                        .build())
                .uploadedAt(a.getUploadedAt())
                .build();
    }
}
