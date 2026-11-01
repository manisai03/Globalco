package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ForgotPasswordRequest;
import com.globalco.jobboard.dto.request.ResetPasswordRequest;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.model.PasswordResetOtp;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.AdminRepository;
import com.globalco.jobboard.repository.PasswordResetOtpRepository;
import com.globalco.jobboard.repository.UserRepository;
import com.globalco.jobboard.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AdminRepository adminRepository;
    @Mock private AccountService accountService;
    @Mock private PasswordResetOtpRepository otpRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private static ForgotPasswordRequest forgot(String email) {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail(email);
        return request;
    }

    private static ResetPasswordRequest reset(String otp) {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("cand@example.com");
        request.setOtp(otp);
        request.setNewPassword("newpassword123");
        return request;
    }

    @Test
    void forgotPasswordForUnknownEmailSucceedsSilently() {
        when(accountService.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> authService.sendPasswordResetOtp(forgot("nobody@example.com")));
        verifyNoInteractions(emailService);
        verify(otpRepository, never()).save(any());
    }

    @Test
    void forgotPasswordSkipsResendWithinCooldown() {
        User user = User.builder().id(1L).email("cand@example.com").build();
        when(accountService.findByEmail("cand@example.com")).thenReturn(Optional.of(user));
        PasswordResetOtp recent = PasswordResetOtp.builder().email("cand@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(10)).createdAt(LocalDateTime.now().minusSeconds(10)).build();
        when(otpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("cand@example.com"))
                .thenReturn(Optional.of(recent));

        authService.sendPasswordResetOtp(forgot("cand@example.com"));

        verify(emailService, never()).sendOtp(anyString(), anyString());
    }

    @Test
    void resetPasswordInvalidatesOtpAfterMaxFailedAttempts() {
        PasswordResetOtp otp = PasswordResetOtp.builder().email("cand@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(10)).build();
        when(otpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("cand@example.com"))
                .thenReturn(Optional.of(otp));

        for (int i = 1; i < AuthService.MAX_OTP_ATTEMPTS; i++) {
            BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.resetPassword(reset("000000")));
            assertEquals("Invalid OTP", ex.getMessage());
            assertFalse(otp.isUsed());
        }

        BadRequestException last = assertThrows(BadRequestException.class, () -> authService.resetPassword(reset("000000")));
        assertTrue(last.getMessage().startsWith("Too many incorrect attempts"));
        assertTrue(otp.isUsed());
        assertEquals(AuthService.MAX_OTP_ATTEMPTS, otp.getFailedAttempts());
        verifyNoInteractions(userRepository, adminRepository);
    }

    @Test
    void resetPasswordSucceedsWithCorrectOtp() {
        PasswordResetOtp otp = PasswordResetOtp.builder().email("cand@example.com").otp("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(10)).build();
        User user = User.builder().id(1L).email("cand@example.com").build();
        when(otpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("cand@example.com"))
                .thenReturn(Optional.of(otp));
        when(accountService.findByEmail("cand@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpassword123")).thenReturn("hashed");

        authService.resetPassword(reset("123456"));

        assertEquals("hashed", user.getPassword());
        assertTrue(otp.isUsed());
    }
}
