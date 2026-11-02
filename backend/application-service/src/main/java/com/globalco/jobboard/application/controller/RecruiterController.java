package com.globalco.jobboard.application.controller;

import com.globalco.jobboard.application.service.ApplicationService;
import com.globalco.jobboard.application.service.RecruiterDashboardService;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.ApplicationAnalyticsResponse;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.dto.response.DashboardResponse;
import com.globalco.jobboard.common.dto.response.PageResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Recruiter console endpoints under /api/admin (except /api/admin/jobs, which job-service owns). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RecruiterController {

    private final RecruiterDashboardService dashboardService;
    private final ApplicationService applicationService;
    private final CurrentAccount currentAccount;

    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard() {
        return ApiResponse.ok(dashboardService.getDashboard(currentAccount.requireAdmin()));
    }

    @GetMapping("/applicants")
    public ApiResponse<PageResponse<ApplicationResponse>> applicants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long jobId) {
        return ApiResponse.ok(applicationService.getApplicants(currentAccount.requireAdmin(), page, size, search, jobId));
    }

    @GetMapping("/analytics/applications")
    public ApiResponse<ApplicationAnalyticsResponse> applicationAnalytics(
            @RequestParam(defaultValue = "month") String period) {
        return ApiResponse.ok(dashboardService.getApplicationAnalytics(period, currentAccount.requireAdmin()));
    }
}
