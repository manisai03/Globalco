package com.globalco.jobboard.common.dto.internal;

/** Candidate data other services need, owned by auth-service. */
public record UserSummary(
        Long id,
        String email,
        String fullName,
        String phone,
        String location,
        String bio,
        String skills,
        String resumeUrl) {

    public boolean profileComplete() {
        return skills != null && !skills.isBlank() && resumeUrl != null && !resumeUrl.isBlank();
    }
}
