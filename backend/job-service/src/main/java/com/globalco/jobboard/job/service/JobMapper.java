package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.job.model.Job;

public final class JobMapper {

    private JobMapper() {}

    public static JobResponse toResponse(Job job) {
        return toResponse(job, false, false);
    }

    public static JobResponse toResponse(Job job, boolean saved, boolean applied) {
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .description(job.getDescription())
                .location(job.getLocation())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .experienceLevel(job.getExperienceLevel())
                .jobType(job.getJobType())
                .category(job.getCategory())
                .skills(job.getSkills())
                .status(job.getStatus())
                .featured(job.getFeatured())
                .createdAt(job.getCreatedAt())
                .createdById(job.getRecruiterId())
                .createdByName(job.getRecruiterName())
                .companyDescription(job.getRecruiterCompanyDescription())
                .companyWebsite(job.getRecruiterCompanyWebsite())
                .recruiterTitle(job.getRecruiterTitle())
                .saved(saved)
                .applied(applied)
                .build();
    }

    public static JobSummary toSummary(Job job) {
        return new JobSummary(job.getId(), job.getTitle(), job.getCompany(), job.getLocation(), job.getSkills(),
                job.getExperienceLevel(), job.getJobType(), job.getCategory(), job.getStatus(),
                job.getRecruiterId(), job.getCreatedAt());
    }
}
