package com.globalco.jobboard.auth.controller;

import com.globalco.jobboard.auth.service.AccountService;
import com.globalco.jobboard.auth.service.UserService;
import com.globalco.jobboard.common.dto.request.ChangePasswordRequest;
import com.globalco.jobboard.common.dto.request.DeleteAccountRequest;
import com.globalco.jobboard.common.dto.request.ProfileUpdateRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.UserResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AccountService accountService;
    private final CurrentAccount currentAccount;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getProfile() {
        return ApiResponse.ok(userService.getProfile(accountService.load(currentAccount.require())));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.ok(userService.updateProfile(accountService.load(currentAccount.require()), request));
    }

    @PostMapping("/me/resume")
    public ApiResponse<UserResponse> uploadResume(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Resume uploaded",
                userService.uploadResume(accountService.loadUser(currentAccount.requireUser()), file));
    }

    @PostMapping("/me/avatar")
    public ApiResponse<UserResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Profile picture updated",
                userService.uploadProfilePicture(accountService.loadUser(currentAccount.requireUser()), file));
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteAccount(@Valid @RequestBody DeleteAccountRequest request) {
        userService.deleteAccount(accountService.load(currentAccount.require()), request.getPassword());
        return ApiResponse.ok("Your account and its data have been deleted", null);
    }

    /** Signs out every other session; the caller gets a fresh token in {@code data.token}. */
    @PutMapping("/me/password")
    public ApiResponse<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        String token = userService.changePassword(accountService.load(currentAccount.require()), request);
        return ApiResponse.ok("Password updated. Other devices have been signed out.", Map.of("token", token));
    }
}
