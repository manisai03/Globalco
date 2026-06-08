package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.ChangePasswordRequest;
import com.globalco.jobboard.dto.request.ProfileUpdateRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.UserResponse;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getProfile() {
        return ApiResponse.ok(userService.getProfile(securityUtils.getCurrentAccount()));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.ok(userService.updateProfile(securityUtils.getCurrentAccount(), request));
    }

    @PostMapping("/me/resume")
    public ApiResponse<UserResponse> uploadResume(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Resume uploaded", userService.uploadResume(securityUtils.getCurrentUser(), file));
    }

    @PostMapping("/me/avatar")
    public ApiResponse<UserResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Profile picture updated", userService.uploadProfilePicture(securityUtils.getCurrentUser(), file));
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(securityUtils.getCurrentAccount(), request);
        return ApiResponse.ok("Password updated", null);
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable Long id) {
        return ApiResponse.ok(userService.getUserById(id));
    }
}
