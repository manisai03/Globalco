package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.client.AiServiceClient;
import com.globalco.jobboard.common.client.ApplicationServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.JobApplicationStats;
import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.response.JobResponse;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.repository.SavedJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Adds viewer-specific data to job cards. A page of jobs costs at most three remote calls
 * (application stats, candidate profile, batch match scores), and every call degrades
 * gracefully: if a dependency is down the jobs still render, just without that extra data.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobEnricher {

    private final SavedJobRepository savedJobRepository;
    private final ApplicationServiceClient applicationServiceClient;
    private final AuthServiceClient authServiceClient;
    private final AiServiceClient aiServiceClient;
    private final RemoteCalls remoteCalls;

    public List<JobResponse> enrich(List<Job> jobs, AccountPrincipal viewer) {
        return enrich(jobs, viewer, true);
    }

    public List<JobResponse> enrich(List<Job> jobs, AccountPrincipal viewer, boolean includeMatch) {
        if (jobs.isEmpty()) {
            return List.of();
        }
        List<Long> jobIds = jobs.stream().map(Job::getId).toList();
        Long userId = viewer != null ? viewer.id() : null;

        JobApplicationStats stats = fetchStats(jobIds, userId);
        Map<Long, Long> applicantCounts = stats.applicantCounts() != null ? stats.applicantCounts() : Map.of();
        Set<Long> appliedIds = stats.appliedJobIds() != null ? new HashSet<>(stats.appliedJobIds()) : Set.of();
        Set<Long> savedIds = userId != null
                ? new HashSet<>(savedJobRepository.findSavedJobIds(userId, jobIds))
                : Set.of();

        List<JobResponse> responses = jobs.stream().map(job -> {
            JobResponse response = JobMapper.toResponse(job, savedIds.contains(job.getId()), appliedIds.contains(job.getId()));
            response.setApplicantCount(applicantCounts.getOrDefault(job.getId(), 0L));
            return response;
        }).toList();

        if (userId != null && includeMatch) {
            attachMatchPreviews(jobs, responses, userId);
        }
        return responses;
    }

    public UserSummary fetchUser(Long userId) {
        try {
            return remoteCalls.call("auth-service", () -> authServiceClient.getUser(userId));
        } catch (Exception e) {
            log.warn("auth-service unavailable for user {}: {}", userId, e.getMessage());
            return null;
        }
    }

    private JobApplicationStats fetchStats(List<Long> jobIds, Long userId) {
        try {
            return remoteCalls.call("application-service",
                    () -> applicationServiceClient.getJobStats(new JobApplicationStats.Query(jobIds, userId)));
        } catch (Exception e) {
            log.warn("application-service unavailable, rendering jobs without applicant stats: {}", e.getMessage());
            return JobApplicationStats.empty();
        }
    }

    private void attachMatchPreviews(List<Job> jobs, List<JobResponse> responses, Long userId) {
        UserSummary user = fetchUser(userId);
        if (user == null) {
            return;
        }
        List<MatchInput> inputs = new ArrayList<>(jobs.size());
        for (int i = 0; i < jobs.size(); i++) {
            Job job = jobs.get(i);
            inputs.add(new MatchInput(job.getSkills(), job.getLocation(), job.getCreatedAt(),
                    responses.get(i).getApplicantCount(), user.skills(), user.location(), user.profileComplete()));
        }
        try {
            List<MatchBreakdownResponse> scores = remoteCalls.call("ai-service", () -> aiServiceClient.matchBatch(inputs));
            for (int i = 0; i < responses.size() && i < scores.size(); i++) {
                responses.get(i).setMatchPreview(scores.get(i));
            }
        } catch (Exception e) {
            log.warn("ai-service unavailable, rendering jobs without match preview: {}", e.getMessage());
        }
    }
}
