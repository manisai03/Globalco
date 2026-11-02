package com.globalco.jobboard.job.controller;

import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.CompanyResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.job.service.CompanyService;
import com.globalco.jobboard.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PublicController {

    private final JobService jobService;
    private final CompanyService companyService;
    private final CurrentAccount currentAccount;

    @GetMapping("/api/public/health")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.ok(Map.of("status", "UP"));
    }

    @GetMapping("/api/public/stats")
    public ApiResponse<Map<String, Long>> stats() {
        return ApiResponse.ok(Map.of(
                "openJobs", jobService.countOpenJobs(),
                "totalJobs", jobService.countAllJobs()));
    }

    @GetMapping("/api/companies/{recruiterId}")
    public ApiResponse<CompanyResponse> getCompany(@PathVariable Long recruiterId) {
        return ApiResponse.ok(companyService.getCompany(recruiterId, currentAccount.userOrNull()));
    }
}
