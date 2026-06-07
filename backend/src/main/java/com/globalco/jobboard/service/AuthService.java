package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ForgotPasswordRequest;
import com.globalco.jobboard.dto.request.LoginRequest;
import com.globalco.jobboard.dto.request.RegisterRequest;
import com.globalco.jobboard.dto.request.ResetPasswordRequest;
import com.globalco.jobboard.dto.response.AuthResponse;
import com.globalco.jobboard.dto.response.RegisterResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.PasswordResetOtp;
import com.globalco.jobboard.model.Role;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.PasswordResetOtpRepository;
import com.globalco.jobboard.repository.RoleRepository;
import com.globalco.jobboard.repository.UserRepository;
import com.globalco.jobboard.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        boolean isRecruiter = "RECRUITER".equalsIgnoreCase(request.getAccountType());
        if (isRecruiter) {
            if (request.getCompanyName() == null || request.getCompanyName().isBlank()) {
                throw new BadRequestException("Company name is required for recruiters");
            }
            if (request.getRecruiterTitle() == null || request.getRecruiterTitle().isBlank()) {
                throw new BadRequestException("Your role/title is required for recruiters");
            }
        }

        String roleName = isRecruiter ? "ROLE_ADMIN" : "ROLE_USER";
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("Role not found"));

        User.UserBuilder userBuilder = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .location(request.getLocation())
                .role(role);

        if (isRecruiter) {
            userBuilder
                    .companyName(request.getCompanyName())
                    .companyWebsite(request.getCompanyWebsite())
                    .companyDescription(request.getCompanyDescription())
                    .recruiterTitle(request.getRecruiterTitle());
        } else {
            userBuilder
                    .currentTitle(request.getCurrentTitle())
                    .skills(request.getSkills());
        }

        User user = userBuilder.build();
        userRepository.save(user);

        return RegisterResponse.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .message("Account created successfully. Please sign in to continue.")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPassword())
                        .authorities(user.getRole().getName())
                        .build());

        return AuthResponse.builder()
                .token(token)
                .user(EntityMapper.toUserResponse(user))
                .build();
    }

    @Transactional
    public void sendPasswordResetOtp(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));

        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        PasswordResetOtp resetOtp = PasswordResetOtp.builder()
                .email(user.getEmail())
                .otp(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();
        otpRepository.save(resetOtp);
        emailService.sendOtp(user.getEmail(), otp);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetOtp resetOtp = otpRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new BadRequestException("No OTP found. Please request a new one."));

        if (resetOtp.isUsed()) {
            throw new BadRequestException("OTP already used. Please request a new one.");
        }
        if (resetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }
        if (!resetOtp.getOtp().equals(request.getOtp())) {
            throw new BadRequestException("Invalid OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetOtp.setUsed(true);
        otpRepository.save(resetOtp);
    }
}
