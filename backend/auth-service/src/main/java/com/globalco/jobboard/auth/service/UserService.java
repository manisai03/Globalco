package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.Admin;
import com.globalco.jobboard.auth.model.AuthenticatedAccount;
import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.auth.repository.AdminRepository;
import com.globalco.jobboard.auth.repository.PasswordResetOtpRepository;
import com.globalco.jobboard.auth.repository.UserRepository;
import com.globalco.jobboard.common.dto.request.ChangePasswordRequest;
import com.globalco.jobboard.common.dto.request.ProfileUpdateRequest;
import com.globalco.jobboard.common.dto.response.UserResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.common.security.JwtService;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final CloudinaryService cloudinaryService;
    private final EventPublisher eventPublisher;
    private final PasswordResetOtpRepository otpRepository;
    private final JwtService jwtService;

    public UserResponse getProfile(AuthenticatedAccount account) {
        return AccountMapper.toUserResponse(account);
    }

    @Transactional
    public UserResponse updateProfile(AuthenticatedAccount account, ProfileUpdateRequest request) {
        if (account instanceof Admin admin) {
            if (request.getFullName() != null) admin.setFullName(request.getFullName());
            if (request.getPhone() != null) admin.setPhone(request.getPhone());
            if (request.getLocation() != null) admin.setLocation(request.getLocation());
            if (request.getCompanyName() != null) {
                if (RecruiterCompanyUtils.isLegacyPlaceholder(request.getCompanyName())) {
                    throw new BadRequestException("Enter your real company name (e.g. XPO)");
                }
                admin.setCompanyName(request.getCompanyName().trim());
            }
            if (request.getCompanyWebsite() != null) admin.setCompanyWebsite(request.getCompanyWebsite());
            if (request.getCompanyDescription() != null) admin.setCompanyDescription(request.getCompanyDescription());
            if (request.getRecruiterTitle() != null) admin.setRecruiterTitle(request.getRecruiterTitle());
            Admin saved = adminRepository.save(admin);
            // job-service keeps a copy of these details on each posting.
            eventPublisher.publish(EventTopics.RECRUITER_UPDATED, AccountMapper.toRecruiterUpdated(saved));
            return AccountMapper.toUserResponse(saved);
        }

        User user = (User) account;
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getSkills() != null) user.setSkills(request.getSkills());
        if (request.getCurrentTitle() != null) user.setCurrentTitle(request.getCurrentTitle());
        if (request.getHeadline() != null) user.setHeadline(request.getHeadline());
        if (request.getOpenToWork() != null) user.setOpenToWork(request.getOpenToWork());
        if (request.getEducationProfile() != null) user.setEducationProfile(request.getEducationProfile());
        if (request.getInternshipsProfile() != null) user.setInternshipsProfile(request.getInternshipsProfile());
        if (request.getEmploymentProfile() != null) user.setEmploymentProfile(request.getEmploymentProfile());
        return AccountMapper.toUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse uploadResume(User user, MultipartFile file) {
        return AccountMapper.toUserResponse(storeResume(user, file));
    }

    @Transactional
    public User storeResume(User user, MultipartFile file) {
        String url = fileStorageService.store(file, "resumes", FileStorageService.RESUME_EXTENSIONS);
        user.setResumeUrl(url);
        user.setResumeUploadedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Transactional
    public UserResponse uploadProfilePicture(User user, MultipartFile file) {
        CloudinaryService.UploadResult result = cloudinaryService.uploadProfilePicture(
                file, user.getId(), user.getProfilePicturePublicId());
        user.setProfilePictureUrl(result.url());
        user.setProfilePicturePublicId(result.publicId());
        user.setProfilePictureUploadedAt(LocalDateTime.now());
        return AccountMapper.toUserResponse(userRepository.save(user));
    }

    /**
     * Deletes the account after re-checking the password. Other services remove what they hold for it
     * (jobs, applications, messages, notifications) when they receive the account.deleted event.
     */
    @Transactional
    public void deleteAccount(AuthenticatedAccount account, String password) {
        if (password == null || !passwordEncoder.matches(password, account.getPassword())) {
            throw new BadRequestException("Password is incorrect");
        }
        otpRepository.deleteByEmail(account.getEmail());
        AccountType type;
        if (account instanceof Admin admin) {
            adminRepository.delete(admin);
            type = AccountType.ADMIN;
        } else {
            User user = (User) account;
            userRepository.delete(user);
            type = AccountType.USER;
            String resumeUrl = user.getResumeUrl();
            String avatarId = user.getProfilePicturePublicId();
            runAfterCommit(() -> {
                fileStorageService.deleteQuietly(resumeUrl);
                cloudinaryService.deleteQuietly(avatarId);
            });
        }
        eventPublisher.publish(EventTopics.ACCOUNT_DELETED, new Events.AccountDeleted(type, account.getId()));
    }

    private static void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    /** @return a new token for the caller; tokens issued before the change stop working */
    @Transactional
    public String changePassword(AuthenticatedAccount account, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), account.getPassword())) {
            throw new BadRequestException("New password must be different from your current password");
        }
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
        return jwtService.generateToken(account.toPrincipal(), account.getTokenVersion());
    }
}
