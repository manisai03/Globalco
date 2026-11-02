package com.globalco.jobboard.common.dto.internal;

import java.time.LocalDateTime;

/** Job data application-service needs, owned by job-service. */
public record JobSummary(
        Long id,
        String title,
        String company,
        String location,
        String skills,
        String experienceLevel,
        String jobType,
        String category,
        String status,
        Long recruiterId,
        LocalDateTime createdAt) {}
