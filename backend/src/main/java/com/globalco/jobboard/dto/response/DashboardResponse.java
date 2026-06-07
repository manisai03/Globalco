package com.globalco.jobboard.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardResponse {
    private long totalJobs;
    private long totalApplications;
    private long totalUsers;
    private long openJobs;
    private long pendingApplications;
    private List<ApplicationResponse> recentApplications;
    private Map<String, Long> applicationsPerJob;
    private Map<String, Long> jobsByCategory;
    private Map<String, Long> monthlyApplications;
    private Map<String, Long> candidateStatusAnalytics;
}
