package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ChangePasswordRequest;
import com.globalco.jobboard.dto.request.ProfileUpdateRequest;
import com.globalco.jobboard.dto.response.UserResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.UserRepository;
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
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final CloudinaryService cloudinaryService;

    public UserResponse getProfile(User user) {
        return EntityMapper.toUserResponse(user);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return EntityMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(User user, ProfileUpdateRequest request) {
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getSkills() != null) user.setSkills(request.getSkills());
        if (request.getCurrentTitle() != null) user.setCurrentTitle(request.getCurrentTitle());
        if (request.getCompanyName() != null) user.setCompanyName(request.getCompanyName());
        if (request.getCompanyWebsite() != null) user.setCompanyWebsite(request.getCompanyWebsite());
        if (request.getCompanyDescription() != null) user.setCompanyDescription(request.getCompanyDescription());
        if (request.getRecruiterTitle() != null) user.setRecruiterTitle(request.getRecruiterTitle());
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
    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
