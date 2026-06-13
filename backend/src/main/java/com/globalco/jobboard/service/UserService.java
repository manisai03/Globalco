package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ChangePasswordRequest;
import com.globalco.jobboard.dto.request.ProfileUpdateRequest;
import com.globalco.jobboard.dto.response.UserResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.AdminRepository;
import com.globalco.jobboard.repository.UserRepository;
import com.globalco.jobboard.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public UserResponse getProfile(AuthenticatedAccount account) {
        return EntityMapper.toUserResponse(account);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return EntityMapper.toUserResponse(user);
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
            return EntityMapper.toUserResponse(adminRepository.save(admin));
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
        return EntityMapper.toUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse uploadResume(User user, MultipartFile file) {
        String url = fileStorageService.store(file, "resumes");
        user.setResumeUrl(url);
        user.setResumeUploadedAt(LocalDateTime.now());
        return EntityMapper.toUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse uploadProfilePicture(User user, MultipartFile file) {
        CloudinaryService.UploadResult result = cloudinaryService.uploadProfilePicture(
                file, user.getId(), user.getProfilePicturePublicId());
        user.setProfilePictureUrl(result.url());
        user.setProfilePicturePublicId(result.publicId());
        user.setProfilePictureUploadedAt(LocalDateTime.now());
        return EntityMapper.toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(AuthenticatedAccount account, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), account.getPassword())) {
            throw new BadRequestException("New password must be different from your current password");
        }
        String encoded = passwordEncoder.encode(request.getNewPassword());
        if (account instanceof Admin admin) {
            admin.setPassword(encoded);
            adminRepository.save(admin);
        } else {
            User user = (User) account;
            user.setPassword(encoded);
            userRepository.save(user);
        }
    }
}
