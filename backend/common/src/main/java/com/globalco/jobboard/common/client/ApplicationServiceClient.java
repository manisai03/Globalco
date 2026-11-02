package com.globalco.jobboard.common.client;

import com.globalco.jobboard.common.dto.internal.JobApplicationStats;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "application-service", contextId = "applicationServiceClient", path = "/internal/applications")
public interface ApplicationServiceClient {

    @PostMapping("/job-stats")
    JobApplicationStats getJobStats(@RequestBody JobApplicationStats.Query query);

    /** True once the recruiter has opened at least one application from this candidate. */
    @GetMapping("/recruiter-viewed")
    boolean hasRecruiterViewedApplicant(@RequestParam("userId") Long userId, @RequestParam("recruiterId") Long recruiterId);

    /** Candidate ids (most recent first) who applied to any job owned by the recruiter. */
    @GetMapping("/recruiters/{recruiterId}/candidates")
    List<Long> getCandidateIds(@PathVariable("recruiterId") Long recruiterId);

    /** Candidate ids whose identity the recruiter has unlocked by opening one of their applications. */
    @GetMapping("/recruiters/{recruiterId}/viewed-candidates")
    List<Long> getViewedCandidateIds(@PathVariable("recruiterId") Long recruiterId);

    /**
     * Whether the account may open a stored resume: a candidate if it is attached to one of their applications;
     * a recruiter if it belongs to an application to their jobs (or is the profile resume of such an applicant,
     * {@code profileOwnerId}) and they have opened that application.
     */
    @GetMapping("/resume-access")
    boolean canAccessResume(@RequestParam("url") String url,
                            @RequestParam("accountType") String accountType,
                            @RequestParam("accountId") Long accountId,
                            @RequestParam(value = "profileOwnerId", required = false) Long profileOwnerId);
}
