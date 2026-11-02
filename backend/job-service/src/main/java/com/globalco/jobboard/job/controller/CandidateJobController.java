package com.globalco.jobboard.job.controller;

import com.globalco.jobboard.common.dto.request.SavedSearchRequest;
import com.globalco.jobboard.common.dto.response.ApiResponse;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.dto.response.SavedSearchResponse;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.security.CurrentAccount;
import com.globalco.jobboard.job.service.SavedJobService;
import com.globalco.jobboard.job.service.SavedSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Candidate bookmarks (/api/saved-jobs) and job alerts (/api/saved-searches). */
@RestController
@RequiredArgsConstructor
public class CandidateJobController {

    private final SavedJobService savedJobService;
    private final SavedSearchService savedSearchService;
    private final CurrentAccount currentAccount;

    @GetMapping("/api/saved-jobs")
    public ApiResponse<List<JobResponse>> getSavedJobs() {
        return ApiResponse.ok(savedJobService.getSavedJobs(currentAccount.requireUser()));
    }

    @PostMapping("/api/saved-jobs/{jobId}")
    public ApiResponse<Void> saveJob(@PathVariable Long jobId) {
        savedJobService.saveJob(jobId, currentAccount.requireUser());
        return ApiResponse.ok("Job saved", null);
    }

    @DeleteMapping("/api/saved-jobs/{jobId}")
    public ApiResponse<Void> unsaveJob(@PathVariable Long jobId) {
        savedJobService.unsaveJob(jobId, currentAccount.requireUser());
        return ApiResponse.ok("Job removed from saved", null);
    }

    @GetMapping("/api/saved-searches")
    public ApiResponse<List<SavedSearchResponse>> listSavedSearches() {
        return ApiResponse.ok(savedSearchService.getSavedSearches(currentAccount.requireUser()));
    }

    @PostMapping("/api/saved-searches")
    public ApiResponse<SavedSearchResponse> createSavedSearch(@Valid @RequestBody SavedSearchRequest request) {
        return ApiResponse.ok("Job alert saved", savedSearchService.create(currentAccount.requireUser(), request));
    }

    @PatchMapping("/api/saved-searches/{id}")
    public ApiResponse<SavedSearchResponse> updateSavedSearch(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("alertsEnabled");
        if (enabled == null) {
            throw new BadRequestException("alertsEnabled is required");
        }
        return ApiResponse.ok(enabled ? "Job alert turned on" : "Job alert turned off",
                savedSearchService.setAlertsEnabled(id, enabled, currentAccount.requireUser()));
    }

    @DeleteMapping("/api/saved-searches/{id}")
    public ApiResponse<Void> deleteSavedSearch(@PathVariable Long id) {
        savedSearchService.delete(id, currentAccount.requireUser());
        return ApiResponse.ok("Job alert removed", null);
    }
}
