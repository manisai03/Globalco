package com.globalco.jobboard.common.dto.internal;

import java.time.LocalDateTime;

/** Everything ai-service needs to score a candidate against a job, without reading either database. */
public record MatchInput(
        String jobSkills,
        String jobLocation,
        LocalDateTime jobCreatedAt,
        long applicantCount,
        String candidateSkills,
        String candidateLocation,
        boolean profileComplete) {

    public static MatchInput of(JobSummary job, UserSummary user, long applicantCount) {
        return new MatchInput(job.skills(), job.location(), job.createdAt(), applicantCount,
                user.skills(), user.location(), user.profileComplete());
    }
}
