package com.globalco.jobboard.application.service;

import com.globalco.jobboard.application.repository.ApplicationRepository;
import com.globalco.jobboard.common.client.JobServiceClient;
import com.globalco.jobboard.common.dto.internal.RecruiterJobStats;
import com.globalco.jobboard.common.dto.response.ApplicationAnalyticsResponse;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.dto.response.DashboardResponse;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecruiterDashboardService {

    private static final List<String> STATUSES =
            List.of("PENDING", "SHORTLISTED", "REJECTED", "INTERVIEW_SCHEDULED", "HIRED", "WITHDRAWN");

    private final ApplicationRepository applicationRepository;
    private final JobServiceClient jobServiceClient;
    private final ApplicationAssembler assembler;
    private final RemoteCalls remoteCalls;

    public DashboardResponse getDashboard(AccountPrincipal recruiter) {
        Long recruiterId = recruiter.id();

        List<ApplicationResponse> recent = assembler.toResponses(
                applicationRepository.findByRecruiterIdOrderByCreatedAtDesc(recruiterId, PageRequest.of(0, 10)), true);

        Map<String, Long> appsPerJob = new HashMap<>();
        applicationRepository.countByJobForRecruiter(recruiterId).forEach(row -> {
            String title = row[1] != null ? (String) row[1] : "Job #" + row[0];
            appsPerJob.merge(title, ((Number) row[2]).longValue(), Long::sum);
        });

        Map<String, Long> monthlyApps = new LinkedHashMap<>();
        applicationRepository.countByMonthForRecruiter(recruiterId).forEach(row ->
                monthlyApps.put(String.format("%d-%02d", ((Number) row[0]).intValue(), ((Number) row[1]).intValue()),
                        ((Number) row[2]).longValue()));

        Map<String, Long> statusAnalytics = new LinkedHashMap<>();
        STATUSES.forEach(status -> statusAnalytics.put(status, 0L));
        applicationRepository.countByStatusForRecruiter(recruiterId).forEach(row ->
                statusAnalytics.put((String) row[0], ((Number) row[1]).longValue()));

        RecruiterJobStats jobStats = fetchJobStats(recruiterId);

        return DashboardResponse.builder()
                .totalJobs(jobStats.totalJobs())
                .totalApplications(applicationRepository.countByRecruiterId(recruiterId))
                .totalUsers(applicationRepository.countDistinctApplicantsForRecruiter(recruiterId))
                .openJobs(jobStats.openJobs())
                .pendingApplications(statusAnalytics.getOrDefault("PENDING", 0L))
                .recentApplications(recent)
                .applicationsPerJob(appsPerJob)
                .jobsByCategory(jobStats.jobsByCategory())
                .monthlyApplications(monthlyApps)
                .candidateStatusAnalytics(statusAnalytics)
                .build();
    }

    public ApplicationAnalyticsResponse getApplicationAnalytics(String period, AccountPrincipal recruiter) {
        LocalDateTime since = resolvePeriodStart(period);
        Long recruiterId = recruiter.id();

        Map<String, Long> breakdown = new LinkedHashMap<>();
        STATUSES.forEach(status -> breakdown.put(status, 0L));
        applicationRepository.countByStatusSinceForRecruiter(recruiterId, since).forEach(row ->
                breakdown.put((String) row[0], ((Number) row[1]).longValue()));

        return ApplicationAnalyticsResponse.builder()
                .period(period)
                .periodLabel(resolvePeriodLabel(period))
                .total(applicationRepository.countByRecruiterIdAndCreatedAtAfter(recruiterId, since))
                .statusBreakdown(breakdown)
                .build();
    }

    /** Job counts come from job-service; the dashboard still renders application data if it is down. */
    private RecruiterJobStats fetchJobStats(Long recruiterId) {
        try {
            return remoteCalls.call("job-service", () -> jobServiceClient.getRecruiterStats(recruiterId));
        } catch (RuntimeException e) {
            log.warn("Job stats unavailable for recruiter {}: {}", recruiterId, e.getMessage());
            return new RecruiterJobStats(0, 0, Map.of());
        }
    }

    private LocalDateTime resolvePeriodStart(String period) {
        LocalDateTime now = LocalDateTime.now();
        return switch (period != null ? period.toLowerCase() : "month") {
            case "week" -> now.minusDays(7);
            case "year" -> now.minusYears(1);
            default -> now.minusDays(30);
        };
    }

    private String resolvePeriodLabel(String period) {
        return switch (period != null ? period.toLowerCase() : "month") {
            case "week" -> "Last 7 days";
            case "year" -> "Last 12 months";
            default -> "Last 30 days";
        };
    }
}
