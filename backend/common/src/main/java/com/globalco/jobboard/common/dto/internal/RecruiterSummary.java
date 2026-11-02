package com.globalco.jobboard.common.dto.internal;

/** Recruiter (admin account) data other services need, owned by auth-service. */
public record RecruiterSummary(
        Long id,
        String email,
        String fullName,
        String location,
        String companyName,
        String companyWebsite,
        String companyDescription,
        String recruiterTitle) {}
