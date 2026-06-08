package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class JobResponse {
    private Long id;
    private String title;
    private String company;
    private String description;
    private String location;
    private BigDecimal salaryMin;
    private BigDecimal salaryMax;
    private String experienceLevel;
    private String jobType;
    private String category;
    private String skills;
    private String status;
    private Boolean featured;
    private Long createdById;
    private String createdByName;
    private String companyDescription;
    private String companyWebsite;
    private String recruiterTitle;
    private LocalDateTime createdAt;
    private Boolean saved;
    private Boolean applied;
    private Long applicantCount;
    private MatchBreakdownResponse matchPreview;
}
