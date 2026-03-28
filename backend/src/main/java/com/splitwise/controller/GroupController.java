package com.splitwise.controller;

import com.splitwise.dto.request.AddMemberRequest;
import com.splitwise.dto.request.CreateGroupRequest;
import com.splitwise.dto.response.GroupResponse;
import com.splitwise.security.UserPrincipal;
import com.splitwise.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest request,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.createGroup(request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<List<GroupResponse>> getMyGroups(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.getGroupsForUser(principal.getId()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponse> getGroup(@PathVariable Long groupId,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.getGroupById(groupId, principal.getId()));
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<GroupResponse> updateGroup(@PathVariable Long groupId,
                                                      @Valid @RequestBody CreateGroupRequest request,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.updateGroup(groupId, request, principal.getId()));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long groupId,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        groupService.deleteGroup(groupId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupResponse> addMember(@PathVariable Long groupId,
                                                    @Valid @RequestBody AddMemberRequest request,
                                                    @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(groupService.addMember(groupId, request, principal.getId()));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long groupId,
                                              @PathVariable Long userId,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        groupService.removeMember(groupId, userId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
