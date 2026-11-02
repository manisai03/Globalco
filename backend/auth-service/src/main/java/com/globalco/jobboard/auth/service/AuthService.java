package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.Admin;
import com.globalco.jobboard.auth.model.AuthenticatedAccount;
import com.globalco.jobboard.auth.model.PasswordResetOtp;
import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.AdminRepository;
import com.globalco.jobboard.auth.repository.PasswordResetOtpRepository;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.dto.request.ForgotPasswordRequest;
import com.globalco.jobboard.common.dto.request.LoginRequest;
import com.globalco.jobboard.common.dto.request.RegisterRequest;
import com.globalco.jobboard.common.dto.request.ResetPasswordRequest;
import com.globalco.jobboard.common.dto.response.AuthResponse;
import com.globalco.jobboard.common.dto.response.RegisterResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.JwtService;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    static final int MAX_OTP_ATTEMPTS = 5;
    static final long OTP_RESEND_COOLDOWN_SECONDS = 60;
    static final int MAX_OTPS_PER_DAY = 5;
    static final Duration EXISTING_EMAIL_NOTICE_COOLDOWN = Duration.ofHours(1);
    private static final int MAX_TRACKED_NOTICES = 10_000;
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Per instance: when each address was last told about a registration attempt (limits inbox spam). */
    private final Map<String, LocalDateTime> existingEmailNotices = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final AccountService accountService;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EventPublisher eventPublisher;
    private final LoginAttemptService loginAttempts;

    /**
     * Answers the same way whether or not the email is taken, so registration can't be used to discover accounts.
     * For a taken email nothing is created and the owner is emailed instead (at most once per hour per address).
     */
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        request.setEmail(trim(request.getEmail()));
        request.setPhone(sanitizePhone(request.getPhone()));
        request.setFullName(trim(request.getFullName()));

        boolean isRecruiter = "RECRUITER".equalsIgnoreCase(request.getAccountType());
        if (isRecruiter) {
            if (request.getCompanyName() == null || request.getCompanyName().isBlank()) {
                throw new BadRequestException("Company name is required for recruiters");
            }
            if (RecruiterCompanyUtils.isLegacyPlaceholder(request.getCompanyName())) {
                throw new BadRequestException("Enter your real company name (e.g. XPO)");
            }
            if (request.getRecruiterTitle() == null || request.getRecruiterTitle().isBlank()) {
                throw new BadRequestException("Your role/title is required for recruiters");
            }
        }

        // Hash before the existence check so both paths take about as long.
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        if (accountService.existsByEmail(request.getEmail())) {
            notifyExistingAccountOwner(request.getEmail());
            return registeredResponse(request.getEmail(), request.getFullName());
        }

        if (isRecruiter) {
            Admin admin = adminRepository.save(Admin.builder()
                    .email(request.getEmail())
                    .password(encodedPassword)
                    .fullName(request.getFullName())
                    .phone(request.getPhone())
                    .location(request.getLocation())
                    .companyName(request.getCompanyName())
                    .companyWebsite(request.getCompanyWebsite())
                    .companyDescription(request.getCompanyDescription())
                    .recruiterTitle(request.getRecruiterTitle())
                    .build());
            return registeredResponse(admin.getEmail(), admin.getFullName());
        }

        User user = userRepository.save(User.builder()
                .email(request.getEmail())
                .password(encodedPassword)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .location(request.getLocation())
                .currentTitle(request.getCurrentTitle())
                .skills(request.getSkills())
                .build());
        return registeredResponse(user.getEmail(), user.getFullName());
    }

    private static RegisterResponse registeredResponse(String email, String fullName) {
        return RegisterResponse.builder()
                .email(email)
                .fullName(fullName)
                .message("Account created successfully. Please sign in to continue.")
                .build();
    }

    private void notifyExistingAccountOwner(String email) {
        String key = email.toLowerCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now();
        if (existingEmailNotices.size() > MAX_TRACKED_NOTICES) {
            existingEmailNotices.values().removeIf(sent -> sent.isBefore(now.minus(EXISTING_EMAIL_NOTICE_COOLDOWN)));
        }
        LocalDateTime last = existingEmailNotices.get(key);
        if (last != null && last.isAfter(now.minus(EXISTING_EMAIL_NOTICE_COOLDOWN))) {
            return;
        }
        existingEmailNotices.put(key, now);
        eventPublisher.publish(EventTopics.REGISTRATION_FOR_EXISTING_EMAIL, new Events.RegistrationForExistingEmail(email));
    }

    public AuthResponse login(LoginRequest request) {
        request.setEmail(trim(request.getEmail()));
        loginAttempts.checkAllowed(request.getEmail());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (AuthenticationException e) {
            loginAttempts.recordFailure(request.getEmail());
            throw e;
        }
        loginAttempts.recordSuccess(request.getEmail());

        AuthenticatedAccount account = accountService.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        return AuthResponse.builder()
                .token(jwtService.generateToken(account.toPrincipal(), account.getTokenVersion()))
                .user(AccountMapper.toUserResponse(account))
                .build();
    }

    /**
     * Silently returns for unknown emails so the endpoint can't be used to discover registered accounts.
     * The OTP email is sent asynchronously by notification-service.
     */
    @Transactional
    public void sendPasswordResetOtp(ForgotPasswordRequest request) {
        AuthenticatedAccount account = accountService.findByEmail(trim(request.getEmail())).orElse(null);
        if (account == null) {
            return;
        }

        boolean recentlySent = otpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(account.getEmail())
                .map(existing -> existing.getCreatedAt() != null
                        && existing.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(OTP_RESEND_COOLDOWN_SECONDS)))
                .orElse(false);
        if (recentlySent) {
            return;
        }
        if (otpRepository.countByEmailAndCreatedAtAfter(account.getEmail(), LocalDateTime.now().minusDays(1))
                >= MAX_OTPS_PER_DAY) {
            return;
        }

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        otpRepository.save(PasswordResetOtp.builder()
                .email(account.getEmail())
                .otp(hashOtp(account.getEmail(), otp))
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build());
        eventPublisher.publish(EventTopics.PASSWORD_RESET_OTP,
                new Events.PasswordResetOtpRequested(account.getEmail(), otp));
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetOtp resetOtp = otpRepository
                .findFirstByEmailAndUsedFalseOrderByCreatedAtDesc(trim(request.getEmail()))
                .orElseThrow(() -> new BadRequestException("No OTP found. Please request a new one."));

        if (resetOtp.isUsed()) {
            throw new BadRequestException("OTP already used. Please request a new one.");
        }
        if (resetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }
        if (!otpMatches(resetOtp.getOtp(), resetOtp.getEmail(), request.getOtp())) {
            int attempts = resetOtp.getFailedAttempts() + 1;
            resetOtp.setFailedAttempts(attempts);
            if (attempts >= MAX_OTP_ATTEMPTS) {
                resetOtp.setUsed(true);
                otpRepository.saveAndFlush(resetOtp);
                throw new BadRequestException("Too many incorrect attempts. Please request a new OTP.");
            }
            otpRepository.saveAndFlush(resetOtp);
            throw new BadRequestException("Invalid OTP");
        }

        AuthenticatedAccount account = accountService.findByEmail(trim(request.getEmail()))
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        String encoded = passwordEncoder.encode(request.getNewPassword());
        account.revokeTokens();
        if (account instanceof Admin admin) {
            admin.setPassword(encoded);
            adminRepository.save(admin);
        } else {
            User user = (User) account;
            user.setPassword(encoded);
            userRepository.save(user);
        }

        resetOtp.setUsed(true);
        otpRepository.save(resetOtp);
        loginAttempts.recordSuccess(account.getEmail());
    }

    /** OTPs are stored as SHA-256(email:otp) so a database leak doesn't reveal live reset codes. */
    static String hashOtp(String email, String otp) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((email.toLowerCase(Locale.ROOT) + ":" + otp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean otpMatches(String storedHash, String email, String provided) {
        if (provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                storedHash.getBytes(StandardCharsets.UTF_8),
                hashOtp(email, provided.trim()).getBytes(StandardCharsets.UTF_8));
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** Strips formatting from mobile autofill e.g. (91) 98765-43210 -> 919876543210 */
    static String sanitizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String cleaned = phone.trim().replaceAll("[\\s().-]", "");
        if (cleaned.startsWith("+")) {
            return "+" + cleaned.substring(1).replaceAll("\\D", "");
        }
        cleaned = cleaned.replaceAll("\\D", "");
        return cleaned.isEmpty() ? null : cleaned;
    }
}
