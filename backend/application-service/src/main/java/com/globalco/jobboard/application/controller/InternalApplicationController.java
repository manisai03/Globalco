package com.globalco.jobboard.application.controller;

import com.globalco.jobboard.application.repository.ApplicationRepository;
import com.globalco.jobboard.common.dto.internal.JobApplicationStats;
import com.globalco.jobboard.common.security.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/applications")
@RequiredArgsConstructor
public class InternalApplicationController {

    private final ApplicationRepository applicationRepository;

    @PostMapping("/job-stats")
    public JobApplicationStats getJobStats(@RequestBody JobApplicationStats.Query query) {
        if (query.jobIds() == null || query.jobIds().isEmpty()) {
            return JobApplicationStats.empty();
        }
        Map<Long, Long> counts = new HashMap<>();
        applicationRepository.countByJobIds(query.jobIds()).forEach(row ->
                counts.put((Long) row[0], ((Number) row[1]).longValue()));
        List<Long> applied = query.userId() != null
                ? applicationRepository.findAppliedJobIds(query.userId(), query.jobIds())
                : List.of();
        return new JobApplicationStats(counts, applied);
    }

    @GetMapping("/recruiter-viewed")
    public boolean hasRecruiterViewedApplicant(@RequestParam Long userId, @RequestParam Long recruiterId) {
        return applicationRepository.hasRecruiterViewedApplicant(userId, recruiterId);
    }

    @GetMapping("/recruiters/{recruiterId}/candidates")
    public List<Long> getCandidateIds(@PathVariable Long recruiterId) {
        return applicationRepository.findCandidateIdsForRecruiter(recruiterId);
    }

    @GetMapping("/recruiters/{recruiterId}/viewed-candidates")
    public List<Long> getViewedCandidateIds(@PathVariable Long recruiterId) {
        return applicationRepository.findViewedCandidateIdsForRecruiter(recruiterId);
    }

    @GetMapping("/resume-access")
    public boolean canAccessResume(@RequestParam String url, @RequestParam String accountType,
                                   @RequestParam Long accountId, @RequestParam(required = false) Long profileOwnerId) {
        if (AccountType.ADMIN.name().equals(accountType)) {
            return applicationRepository.recruiterCanAccessResume(accountId, url, profileOwnerId);
        }
        return applicationRepository.existsByUserIdAndResumeUrl(accountId, url);
    }
}
