package com.globalco.jobboard.job.controller;

import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The one /api/admin/** endpoint owned by job-service (the gateway routes it here explicitly). */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RecruiterJobController {

    private final JobService jobService;
    private final CurrentAccount currentAccount;

    @GetMapping("/api/admin/jobs")
    public ApiResponse<List<JobResponse>> myJobs() {
        return ApiResponse.ok(jobService.getMyJobs(currentAccount.requireAdmin()));
    }
}
