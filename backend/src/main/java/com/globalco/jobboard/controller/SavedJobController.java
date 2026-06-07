package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.SavedJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved-jobs")
@RequiredArgsConstructor
public class SavedJobController {

    private final SavedJobService savedJobService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ApiResponse<List<JobResponse>> getSavedJobs() {
        return ApiResponse.ok(savedJobService.getSavedJobs(securityUtils.getCurrentUser()));
    }

    @PostMapping("/{jobId}")
    public ApiResponse<Void> saveJob(@PathVariable Long jobId) {
        savedJobService.saveJob(jobId, securityUtils.getCurrentUser());
        return ApiResponse.ok("Job saved", null);
    }

    @DeleteMapping("/{jobId}")
    public ApiResponse<Void> unsaveJob(@PathVariable Long jobId) {
        savedJobService.unsaveJob(jobId, securityUtils.getCurrentUser());
        return ApiResponse.ok("Job removed from saved", null);
    }
}
