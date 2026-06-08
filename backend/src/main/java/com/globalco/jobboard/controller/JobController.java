package com.globalco.jobboard.controller;

import com.globalco.jobboard.dto.request.JobRequest;
import com.globalco.jobboard.dto.response.ApiResponse;
import com.globalco.jobboard.dto.response.JobResponse;
import com.globalco.jobboard.dto.response.PageResponse;
import com.globalco.jobboard.security.SecurityUtils;
import com.globalco.jobboard.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ApiResponse<PageResponse<JobResponse>> searchJobs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minSalary,
            @RequestParam(required = false) BigDecimal maxSalary,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "recent") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.ok(jobService.searchJobs(
                search, location, jobType, experienceLevel,
                category, minSalary, maxSalary, status, sort, page, size, securityUtils.getCurrentUserOrNull()));
    }

    @GetMapping("/featured")
    public ApiResponse<List<JobResponse>> featuredJobs() {
        return ApiResponse.ok(jobService.getFeaturedJobs(securityUtils.getCurrentUserOrNull()));
    }

    @GetMapping("/recommended")
    public ApiResponse<List<JobResponse>> recommendedJobs() {
        return ApiResponse.ok(jobService.getRecommendedJobs(securityUtils.getCurrentUserOrNull()));
    }

    @GetMapping("/categories")
    public ApiResponse<List<String>> categories() {
        return ApiResponse.ok(jobService.getCategories());
    }

    @GetMapping("/{id}/similar")
    public ApiResponse<List<JobResponse>> similarJobs(@PathVariable Long id) {
        return ApiResponse.ok(jobService.getSimilarJobs(id, securityUtils.getCurrentUserOrNull()));
    }

    @GetMapping("/{id}")
    public ApiResponse<JobResponse> getJob(@PathVariable Long id) {
        return ApiResponse.ok(jobService.getJobById(id, securityUtils.getCurrentUserOrNull()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<JobResponse> createJob(@Valid @RequestBody JobRequest request) {
        return ApiResponse.ok("Job created", jobService.createJob(request, securityUtils.getCurrentAdmin()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<JobResponse> updateJob(@PathVariable Long id, @Valid @RequestBody JobRequest request) {
        return ApiResponse.ok("Job updated", jobService.updateJob(id, request, securityUtils.getCurrentAdmin()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id, securityUtils.getCurrentAdmin());
        return ApiResponse.ok("Job deleted", null);
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<JobResponse> closeJob(@PathVariable Long id) {
        return ApiResponse.ok(jobService.closeJob(id, securityUtils.getCurrentAdmin()));
    }

    @PatchMapping("/{id}/reopen")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<JobResponse> reopenJob(@PathVariable Long id) {
        return ApiResponse.ok(jobService.reopenJob(id, securityUtils.getCurrentAdmin()));
    }
}
