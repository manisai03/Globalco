package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.response.ApplicationAnalyticsResponse;
import com.globalco.jobboard.dto.response.ApplicationResponse;
import com.globalco.jobboard.dto.response.DashboardResponse;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public DashboardResponse getDashboard(User admin) {
        Long adminId = admin.getId();

        List<ApplicationResponse> recent = applicationRepository
                .findByJobCreatedByIdOrderByCreatedAtDesc(adminId).stream()
                .limit(10)
                .map(EntityMapper::toApplicationResponse)
                .toList();

        Map<String, Long> appsPerJob = applicationRepository.countByJobForAdmin(adminId).stream()
                .collect(Collectors.toMap(
                        row -> "Job #" + row[0],
                        row -> (Long) row[1],
                        (a, b) -> a,
                        HashMap::new));

        Map<String, Long> jobsByCategory = jobRepository.countByCategoryForAdmin(adminId).stream()
                .collect(Collectors.toMap(
                        row -> row[0] != null ? (String) row[0] : "Uncategorized",
                        row -> (Long) row[1],
                        (a, b) -> a,
                        HashMap::new));

        Map<String, Long> monthlyApps = new HashMap<>();
        applicationRepository.countByMonth().forEach(row ->
                monthlyApps.put("Month " + row[0], (Long) row[1]));

        Map<String, Long> statusAnalytics = new LinkedHashMap<>();
        List.of("PENDING", "SHORTLISTED", "REJECTED", "INTERVIEW_SCHEDULED", "HIRED", "WITHDRAWN")
                .forEach(status -> statusAnalytics.put(status,
                        applicationRepository.countByJobCreatedByIdAndStatus(adminId, status)));

        return DashboardResponse.builder()
                .totalJobs(jobRepository.countByCreatedById(adminId))
                .totalApplications(applicationRepository.countByJobCreatedById(adminId))
                .totalUsers(applicationRepository.countDistinctApplicantsByAdmin(adminId))
                .openJobs(jobRepository.countByCreatedByIdAndStatus(adminId, "OPEN"))
                .pendingApplications(applicationRepository.countByJobCreatedByIdAndStatus(adminId, "PENDING"))
                .recentApplications(recent)
                .applicationsPerJob(appsPerJob)
                .jobsByCategory(jobsByCategory)
                .monthlyApplications(monthlyApps)
                .candidateStatusAnalytics(statusAnalytics)
                .build();
    }

    public ApplicationAnalyticsResponse getApplicationAnalytics(String period, User admin) {
        LocalDateTime since = resolvePeriodStart(period);
        String periodLabel = resolvePeriodLabel(period);
        Long adminId = admin.getId();

        Map<String, Long> breakdown = new LinkedHashMap<>();
        List.of("PENDING", "SHORTLISTED", "REJECTED", "INTERVIEW_SCHEDULED", "HIRED", "WITHDRAWN")
                .forEach(status -> breakdown.put(status, 0L));

        applicationRepository.countByStatusSinceForAdmin(adminId, since).forEach(row ->
                breakdown.put((String) row[0], (Long) row[1]));

        long total = applicationRepository.countByJobCreatedByIdAndCreatedAtAfter(adminId, since);

        return ApplicationAnalyticsResponse.builder()
                .period(period)
                .periodLabel(periodLabel)
                .total(total)
                .statusBreakdown(breakdown)
                .build();
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
