package com.globalco.jobboard.common.client;

import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.internal.RecruiterJobStats;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Collection;
import java.util.List;

@FeignClient(name = "job-service", contextId = "jobServiceClient", path = "/internal/jobs")
public interface JobServiceClient {

    @GetMapping("/{id}")
    JobSummary getJob(@PathVariable("id") Long id);

    @PostMapping("/batch")
    List<JobSummary> getJobs(@RequestBody Collection<Long> ids);

    @GetMapping("/recruiters/{recruiterId}/stats")
    RecruiterJobStats getRecruiterStats(@PathVariable("recruiterId") Long recruiterId);
}
