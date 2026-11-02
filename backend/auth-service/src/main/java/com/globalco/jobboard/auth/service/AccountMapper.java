package com.globalco.jobboard.auth.service;

import com.globalco.jobboard.auth.model.Admin;
import com.globalco.jobboard.auth.model.AuthenticatedAccount;
import com.globalco.jobboard.auth.model.User;
import com.globalco.jobboard.common.dto.internal.RecruiterSummary;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.response.UserResponse;
import com.globalco.jobboard.common.event.Events;

public final class AccountMapper {

    private AccountMapper() {}

    public static UserResponse toUserResponse(AuthenticatedAccount account) {
        return account instanceof Admin admin ? toUserResponse(admin) : toUserResponse((User) account);
    }

    public static UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .location(user.getLocation())
                .bio(user.getBio())
                .skills(user.getSkills())
                .resumeUrl(user.getResumeUrl())
                .resumeUploadedAt(user.getResumeUploadedAt())
                .profilePictureUrl(user.getProfilePictureUrl())
                .profilePictureUploadedAt(user.getProfilePictureUploadedAt())
                .currentTitle(user.getCurrentTitle())
                .headline(user.getHeadline())
                .openToWork(user.getOpenToWork())
                .educationProfile(user.getEducationProfile())
                .internshipsProfile(user.getInternshipsProfile())
                .employmentProfile(user.getEmploymentProfile())
                .role("ROLE_USER")
                .createdAt(user.getCreatedAt())
                .build();
    }

    public static UserResponse toUserResponse(Admin admin) {
        return UserResponse.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .fullName(admin.getFullName())
                .phone(admin.getPhone())
                .location(admin.getLocation())
                .companyName(admin.getCompanyName())
                .companyWebsite(admin.getCompanyWebsite())
                .companyDescription(admin.getCompanyDescription())
                .recruiterTitle(admin.getRecruiterTitle())
                .role("ROLE_ADMIN")
                .createdAt(admin.getCreatedAt())
                .build();
    }

    public static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.getLocation(), user.getBio(), user.getSkills(), user.getResumeUrl());
    }

    public static RecruiterSummary toSummary(Admin admin) {
        return new RecruiterSummary(admin.getId(), admin.getEmail(), admin.getFullName(), admin.getLocation(),
                admin.getCompanyName(), admin.getCompanyWebsite(), admin.getCompanyDescription(),
                admin.getRecruiterTitle());
    }

    public static Events.RecruiterUpdated toRecruiterUpdated(Admin admin) {
        return new Events.RecruiterUpdated(admin.getId(), admin.getFullName(), admin.getCompanyName(),
                admin.getCompanyWebsite(), admin.getCompanyDescription(), admin.getRecruiterTitle(),
                admin.getLocation());
    }
}
