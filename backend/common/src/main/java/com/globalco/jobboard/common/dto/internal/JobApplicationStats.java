package com.globalco.jobboard.common.dto.internal;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/** application-service answer for a page of jobs: applicant counts and which ones the viewer applied to. */
public record JobApplicationStats(Map<Long, Long> applicantCounts, List<Long> appliedJobIds) {

    public static JobApplicationStats empty() {
        return new JobApplicationStats(Map.of(), List.of());
    }

    public record Query(Collection<Long> jobIds, Long userId) {}
}
