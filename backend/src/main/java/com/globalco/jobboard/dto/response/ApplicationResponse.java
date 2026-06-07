package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ApplicationResponse {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private String company;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userLocation;
    private String userSkills;
    private String resumeUrl;
    private String coverLetter;
    private Boolean hasResume;
    private String status;
    private Integer matchScore;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
