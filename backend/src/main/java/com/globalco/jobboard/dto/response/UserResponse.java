package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private String location;
    private String bio;
    private String skills;
    private String resumeUrl;
    private LocalDateTime resumeUploadedAt;
    private String profilePictureUrl;
    private LocalDateTime profilePictureUploadedAt;
    private String currentTitle;
    private String educationProfile;
    private String internshipsProfile;
    private String employmentProfile;
    private String companyName;
    private String companyWebsite;
    private String companyDescription;
    private String recruiterTitle;
    private String role;
    private LocalDateTime createdAt;
}
