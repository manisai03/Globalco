package com.globalco.jobboard.application.service;

import com.globalco.jobboard.application.model.Application;
import com.globalco.jobboard.application.model.Interview;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.dto.response.InterviewResponse;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Builds API responses. Candidate contact details live in auth-service, so they are fetched in one
 * batch call per list; if auth-service is unavailable the list still renders with masked names.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApplicationAssembler {

    private final AuthServiceClient authServiceClient;
    private final RemoteCalls remoteCalls;

    public List<ApplicationResponse> toResponses(List<Application> apps, boolean maskUnviewedCandidate) {
        Set<Long> userIds = apps.stream()
                .filter(app -> !maskUnviewedCandidate || Boolean.TRUE.equals(app.getRecruiterViewed()))
                .map(Application::getUserId)
                .collect(Collectors.toSet());
        Map<Long, UserSummary> users = fetchUsers(userIds);
        return apps.stream()
                .map(app -> toResponse(app, users.get(app.getUserId()), maskUnviewedCandidate))
                .toList();
    }

    public ApplicationResponse toResponse(Application app, UserSummary user, boolean maskUnviewedCandidate) {
        String resume = app.getResumeUrl();
        boolean revealed = (!maskUnviewedCandidate || Boolean.TRUE.equals(app.getRecruiterViewed())) && user != null;
        boolean contentRevealed = !maskUnviewedCandidate || Boolean.TRUE.equals(app.getRecruiterViewed());
        Long userId = app.getUserId();
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobId(app.getJobId())
                .jobTitle(app.getJobTitle())
                .company(app.getCompany())
                .userId(userId)
                .userName(revealed ? user.fullName() : RecruiterCompanyUtils.maskedCandidateLabel(userId))
                .userEmail(revealed ? user.email() : null)
                .userPhone(revealed ? user.phone() : null)
                .userLocation(revealed ? user.location() : null)
                .userSkills(revealed ? user.skills() : null)
                .resumeUrl(contentRevealed ? resume : null)
                .coverLetter(contentRevealed ? app.getCoverLetter() : null)
                .hasResume(contentRevealed && resume != null && !resume.isBlank())
                .status(app.getStatus())
                .matchScore(app.getMatchScore())
                .recruiterViewed(app.getRecruiterViewed())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }

    public InterviewResponse toInterviewResponse(Interview interview) {
        Application app = interview.getApplication();
        return InterviewResponse.builder()
                .id(interview.getId())
                .applicationId(app.getId())
                .jobId(app.getJobId())
                .jobTitle(app.getJobTitle())
                .company(app.getCompany())
                .scheduledAt(interview.getScheduledAt())
                .location(interview.getLocation())
                .notes(interview.getNotes())
                .status(interview.getStatus())
                .applicationStatus(app.getStatus())
                .createdAt(interview.getCreatedAt())
                .build();
    }

    public ApplicationDetailResponse toDetail(
            Application app, JobSummary job, UserSummary user, MatchBreakdownResponse matchBreakdown) {
        ApplicationDetailResponse.ApplicationDetailResponseBuilder builder = ApplicationDetailResponse.builder()
                .id(app.getId())
                .jobId(app.getJobId())
                .jobTitle(app.getJobTitle())
                .company(app.getCompany())
                .userId(app.getUserId())
                .userName(user.fullName())
                .userEmail(user.email())
                .userPhone(user.phone())
                .userLocation(user.location())
                .userBio(user.bio())
                .userSkills(user.skills())
                .userProfileResumeUrl(user.resumeUrl())
                .applicationResumeUrl(app.getResumeUrl())
                .coverLetter(app.getCoverLetter())
                .status(app.getStatus())
                .matchScore(app.getMatchScore())
                .matchBreakdown(matchBreakdown)
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt());
        if (job != null) {
            builder.jobLocation(job.location())
                    .jobSkills(job.skills())
                    .jobExperienceLevel(job.experienceLevel())
                    .jobType(job.jobType())
                    .jobCategory(job.category());
        }
        return builder.build();
    }

    private Map<Long, UserSummary> fetchUsers(Set<Long> userIds) {
        if (userIds.isEmpty()) return Map.of();
        try {
            return remoteCalls.call("auth-service", () -> authServiceClient.getUsers(userIds)).stream()
                    .collect(Collectors.toMap(UserSummary::id, Function.identity(), (a, b) -> a));
        } catch (RuntimeException e) {
            log.warn("Candidate details unavailable, returning masked applicants: {}", e.getMessage());
            return Map.of();
        }
    }
}
