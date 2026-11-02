package com.globalco.jobboard.job.service;

import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.model.SavedSearch;

import java.util.Arrays;
import java.util.Locale;

/** In-memory version of {@link JobSpecification} for checking one new job against a saved search. */
final class JobAlertMatcher {

    private JobAlertMatcher() {}

    static boolean matches(SavedSearch search, Job job) {
        if (!"OPEN".equals(job.getStatus())) return false;
        if (notBlank(search.getSearch())) {
            String haystack = String.join(" ", lower(job.getTitle()), lower(job.getCompany()),
                    lower(job.getDescription()), lower(job.getSkills()));
            boolean allTokens = Arrays.stream(search.getSearch().trim().split("\\s+"))
                    .map(t -> t.toLowerCase(Locale.ROOT))
                    .allMatch(haystack::contains);
            if (!allTokens) return false;
        }
        if (notBlank(search.getLocation()) && !lower(job.getLocation()).contains(lower(search.getLocation()).trim())) {
            return false;
        }
        if (notBlank(search.getJobType()) && !search.getJobType().equals(job.getJobType())) return false;
        if (notBlank(search.getExperienceLevel()) && !search.getExperienceLevel().equals(job.getExperienceLevel())) {
            return false;
        }
        if (notBlank(search.getCategory()) && !search.getCategory().equals(job.getCategory())) return false;
        if (search.getMinSalary() != null
                && (job.getSalaryMax() == null || job.getSalaryMax().compareTo(search.getMinSalary()) < 0)) {
            return false;
        }
        return true;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
