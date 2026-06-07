package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.ApplicationAnalyticsResponse;
import com.globalco.jobboard.dto.response.ApplicationResponse;
import com.globalco.jobboard.dto.response.DashboardResponse;
import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.AdminService;
import com.globalco.jobboard.service.ApplicationService;
import com.globalco.jobboard.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ApplicationService applicationService;
    private final JobService jobService;
    private final SecurityUtils securityUtils;

    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard() {
        return ApiResponse.ok(adminService.getDashboard(securityUtils.getCurrentUser()));
    }

    @GetMapping("/applicants")
    public ApiResponse<List<ApplicationResponse>> allApplicants() {
        return ApiResponse.ok(applicationService.getAllApplicants(securityUtils.getCurrentUser()));
    }

    @GetMapping("/jobs")
    public ApiResponse<List<JobResponse>> myJobs() {
        return ApiResponse.ok(jobService.getMyJobs(securityUtils.getCurrentUser()));
    }

    @GetMapping("/analytics/applications")
    public ApiResponse<ApplicationAnalyticsResponse> applicationAnalytics(
            @RequestParam(defaultValue = "month") String period) {
        return ApiResponse.ok(adminService.getApplicationAnalytics(period, securityUtils.getCurrentUser()));
    }
}
