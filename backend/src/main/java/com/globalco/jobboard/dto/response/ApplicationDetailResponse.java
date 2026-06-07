package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ApplicationDetailResponse {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private String company;
    private String jobLocation;
    private String jobSkills;
    private String jobExperienceLevel;
    private String jobType;
    private String jobCategory;

    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userLocation;
    private String userBio;
    private String userSkills;
    private String userProfileResumeUrl;

    private String applicationResumeUrl;
    private String coverLetter;
    private String status;
    private Integer matchScore;
    private MatchBreakdownResponse matchBreakdown;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
