package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.ApplicationRequest;
import com.globalco.jobboard.dto.request.InterviewRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.dto.response.ApplicationResponse;
import com.globalco.jobboard.dto.response.InterviewResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;
    private final SecurityUtils securityUtils;

    @PostMapping("/jobs/{jobId}")
    public ApiResponse<ApplicationResponse> apply(
            @PathVariable Long jobId,
            @RequestParam(required = false) String coverLetter,
            @RequestParam(required = false) MultipartFile resume) {
        ApplicationRequest request = new ApplicationRequest();
        request.setCoverLetter(coverLetter);
        return ApiResponse.ok("Application submitted",
                applicationService.apply(jobId, request, resume, securityUtils.getCurrentUser()));
    }

    @GetMapping("/me")
    public ApiResponse<List<ApplicationResponse>> myApplications() {
        return ApiResponse.ok(applicationService.getMyApplications(securityUtils.getCurrentUser()));
    }

    @GetMapping("/interviews/me")
    public ApiResponse<List<InterviewResponse>> myInterviews() {
        return ApiResponse.ok(applicationService.getMyInterviews(securityUtils.getCurrentUser()));
    }

    @GetMapping("/{id}")
    public ApiResponse<ApplicationDetailResponse> getApplication(@PathVariable Long id) {
        return ApiResponse.ok(applicationService.getApplicationDetail(id, securityUtils.getCurrentAccount()));
    }

    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<ApplicationResponse>> jobApplicants(@PathVariable Long jobId) {
        return ApiResponse.ok(applicationService.getJobApplicants(jobId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ApplicationResponse> updateStatus(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        return ApiResponse.ok(applicationService.updateStatus(id, body.get("status"), securityUtils.getCurrentAdmin()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> withdraw(@PathVariable Long id) {
        applicationService.withdraw(id, securityUtils.getCurrentUser());
        return ApiResponse.ok("Application withdrawn", null);
    }

    @PostMapping("/interviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> scheduleInterview(@Valid @RequestBody InterviewRequest request) {
        applicationService.scheduleInterview(request, securityUtils.getCurrentAdmin());
        return ApiResponse.ok("Interview scheduled", null);
    }
}
