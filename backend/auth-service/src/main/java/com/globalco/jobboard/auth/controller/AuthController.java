package com.globalco.jobboard.auth.controller;

import com.globalco.jobboard.auth.service.AuthService;
import com.globalco.jobboard.common.dto.request.ForgotPasswordRequest;
import com.globalco.jobboard.common.dto.request.LoginRequest;
import com.globalco.jobboard.common.dto.request.RegisterRequest;
import com.globalco.jobboard.common.dto.request.ResetPasswordRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.AuthResponse;
import com.globalco.jobboard.common.dto.response.RegisterResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Registration successful", authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok("Login successful", authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.sendPasswordResetOtp(request);
        return ApiResponse.ok("If an account exists for this email, an OTP has been sent", null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok("Password reset successful. Please sign in.", null);
    }
}
