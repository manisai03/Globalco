package com.globalco.jobboard.job.controller;

import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.internal.RecruiterJobStats;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.job.repository.JobRepository;
import com.globalco.jobboard.job.service.JobMapper;
import com.globalco.jobboard.job.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping("/internal/jobs")
@RequiredArgsConstructor
public class InternalJobController {

    private final JobRepository jobRepository;
    private final JobService jobService;

    @GetMapping("/{id}")
    public JobSummary getJob(@PathVariable Long id) {
        return jobRepository.findById(id).map(JobMapper::toSummary)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    @PostMapping("/batch")
    public List<JobSummary> getJobs(@RequestBody Collection<Long> ids) {
        return jobRepository.findAllById(ids).stream().map(JobMapper::toSummary).toList();
    }

    @GetMapping("/recruiters/{recruiterId}/stats")
    public RecruiterJobStats getRecruiterStats(@PathVariable Long recruiterId) {
        return jobService.getRecruiterStats(recruiterId);
    }
}
