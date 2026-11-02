package com.globalco.jobboard.application.controller;

import com.globalco.jobboard.application.service.ApplicationService;
import com.globalco.jobboard.common.dto.request.InterviewRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.dto.response.InterviewResponse;
import com.globalco.jobboard.common.security.CurrentAccount;
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
    private final CurrentAccount currentAccount;

    @PostMapping("/jobs/{jobId}")
    public ApiResponse<ApplicationResponse> apply(
            @PathVariable Long jobId,
            @RequestParam(required = false) String coverLetter,
            @RequestParam(required = false) MultipartFile resume) {
        return ApiResponse.ok("Application submitted",
                applicationService.apply(jobId, coverLetter, resume, currentAccount.requireUser()));
    }

    @GetMapping("/me")
    public ApiResponse<List<ApplicationResponse>> myApplications() {
        return ApiResponse.ok(applicationService.getMyApplications(currentAccount.requireUser()));
    }

    @GetMapping("/interviews/me")
    public ApiResponse<List<InterviewResponse>> myInterviews() {
        return ApiResponse.ok(applicationService.getMyInterviews(currentAccount.requireUser()));
    }

    @GetMapping("/{id}")
    public ApiResponse<ApplicationDetailResponse> getApplication(@PathVariable Long id) {
        return ApiResponse.ok(applicationService.getApplicationDetail(id, currentAccount.require()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ApplicationResponse> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ApiResponse.ok(applicationService.updateStatus(id, body.get("status"), currentAccount.requireAdmin()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> withdraw(@PathVariable Long id) {
        applicationService.withdraw(id, currentAccount.requireUser());
        return ApiResponse.ok("Application withdrawn", null);
    }

    @PostMapping("/interviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> scheduleInterview(@Valid @RequestBody InterviewRequest request) {
        applicationService.scheduleInterview(request, currentAccount.requireAdmin());
        return ApiResponse.ok("Interview scheduled", null);
    }
}
