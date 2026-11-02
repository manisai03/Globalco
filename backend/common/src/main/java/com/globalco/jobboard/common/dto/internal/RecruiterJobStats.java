package com.globalco.jobboard.common.dto.internal;

import java.util.Map;

/** job-service answer used by the recruiter dashboard in application-service. */
public record RecruiterJobStats(long totalJobs, long openJobs, Map<String, Long> jobsByCategory) {}
