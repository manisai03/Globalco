package com.globalco.jobboard.application.service;

import com.globalco.jobboard.application.model.Application;
import com.globalco.jobboard.application.model.Interview;
import com.globalco.jobboard.application.repository.ApplicationRepository;
import com.globalco.jobboard.application.repository.InterviewRepository;
import com.globalco.jobboard.common.client.AiServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.client.JobServiceClient;
import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.request.InterviewRequest;
import com.globalco.jobboard.common.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.dto.response.InterviewResponse;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.dto.internal.UserSearch;
import com.globalco.jobboard.common.dto.response.PageResponse;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.common.util.LikePatterns;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Remote calls (job, candidate, resume upload, match score) happen before the local transaction opens,
 * so a slow downstream service never holds a database connection.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationService {

    static final String STATUS_PENDING = "PENDING";
    static final String STATUS_INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED";
    static final String STATUS_WITHDRAWN = "WITHDRAWN";
    static final String STATUS_JOB_REMOVED = "JOB_REMOVED";
    static final String STATUS_SHORTLISTED = "SHORTLISTED";
    static final String STATUS_REJECTED = "REJECTED";
    static final String STATUS_HIRED = "HIRED";
    static final List<String> RECRUITER_STATUSES =
            List.of(STATUS_PENDING, STATUS_SHORTLISTED, STATUS_INTERVIEW_SCHEDULED, STATUS_REJECTED, STATUS_HIRED);
    private static final Set<String> ACTIVE_STATUSES =
            Set.of(STATUS_PENDING, STATUS_SHORTLISTED, STATUS_INTERVIEW_SCHEDULED);
    /** Statuses a recruiter may move to from each status; INTERVIEW_SCHEDULED only via scheduleInterview. */
    static final Map<String, Set<String>> STATUS_TRANSITIONS = Map.of(
            STATUS_PENDING, Set.of(STATUS_SHORTLISTED, STATUS_REJECTED),
            STATUS_SHORTLISTED, Set.of(STATUS_REJECTED, STATUS_HIRED),
            STATUS_INTERVIEW_SCHEDULED, Set.of(STATUS_SHORTLISTED, STATUS_REJECTED, STATUS_HIRED),
            STATUS_REJECTED, Set.of(STATUS_SHORTLISTED));
    private static final Set<String> SCHEDULABLE_STATUSES = ACTIVE_STATUSES;
    private static final Set<String> CLOSES_INTERVIEWS = Set.of(STATUS_REJECTED, STATUS_HIRED);
    static final int MAX_REAPPLIES = 1;
    static final int MAX_COVER_LETTER_LENGTH = 5000;
    static final int MAX_PAGE_SIZE = 100;

    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final JobServiceClient jobServiceClient;
    private final AuthServiceClient authServiceClient;
    private final AiServiceClient aiServiceClient;
    private final ApplicationAssembler assembler;
    private final EventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;
    private final RemoteCalls remoteCalls;

    public ApplicationResponse apply(Long jobId, String coverLetter, MultipartFile resume, AccountPrincipal candidate) {
        JobSummary job = jobServiceClient.getJob(jobId);
        if (!"OPEN".equals(job.status())) {
            throw new BadRequestException("This job is no longer accepting applications");
        }
        Application existing = applicationRepository.findByJobIdAndUserId(jobId, candidate.id()).orElse(null);
        if (existing != null && !STATUS_WITHDRAWN.equals(existing.getStatus())) {
            throw new BadRequestException("You have already applied for this job");
        }
        if (existing != null && existing.getReapplyCount() >= MAX_REAPPLIES) {
            throw new BadRequestException("You have already withdrawn and re-applied for this job once");
        }
        if (coverLetter != null && coverLetter.length() > MAX_COVER_LETTER_LENGTH) {
            throw new BadRequestException("Cover letter must be at most " + MAX_COVER_LETTER_LENGTH + " characters");
        }

        UserSummary user = authServiceClient.getUser(candidate.id());
        String uploadedResume = resume != null && !resume.isEmpty()
                ? authServiceClient.uploadApplicationResume(candidate.id(), resume)
                : null;
        String resumeUrl = uploadedResume != null ? uploadedResume : user.resumeUrl();
        Integer matchScore = scoreOrNull(job, user, activeApplicantCount(jobId));

        // The (job_id, user_id) unique constraint means a withdrawn application is reopened, not duplicated.
        // recruiterViewed is kept on reopen so re-applying can't hide an identity the recruiter already saw.
        Application application = existing != null ? existing : Application.builder()
                .jobId(jobId)
                .userId(candidate.id())
                .build();
        if (existing != null) {
            application.setReapplyCount(existing.getReapplyCount() + 1);
        }
        application.setRecruiterId(job.recruiterId());
        application.setJobTitle(job.title());
        application.setCompany(job.company());
        application.setResumeUrl(resumeUrl);
        application.setCoverLetter(coverLetter);
        application.setMatchScore(matchScore);
        application.setStatus(STATUS_PENDING);

        Application saved;
        try {
            saved = transactionTemplate.execute(status -> {
                Application app = applicationRepository.save(application);
                eventPublisher.publish(EventTopics.APPLICATION_SUBMITTED, new Events.ApplicationSubmitted(
                        app.getId(), jobId, job.title(), candidate.id(), user.fullName(), job.recruiterId()));
                return app;
            });
        } catch (DataIntegrityViolationException e) {
            deleteUploadedResume(candidate.id(), uploadedResume);
            throw new BadRequestException("You have already applied for this job");
        } catch (RuntimeException e) {
            deleteUploadedResume(candidate.id(), uploadedResume);
            throw e;
        }
        return assembler.toResponse(saved, user, false);
    }

    private long activeApplicantCount(Long jobId) {
        return applicationRepository.countByJobIdAndStatusIn(jobId, ACTIVE_STATUSES);
    }

    private void deleteUploadedResume(Long userId, String url) {
        if (url == null) return;
        try {
            authServiceClient.deleteApplicationResume(userId, url);
        } catch (RuntimeException e) {
            log.warn("Could not delete unused resume {}: {}", url, e.getMessage());
        }
    }

    public List<ApplicationResponse> getMyApplications(AccountPrincipal candidate) {
        return assembler.toResponses(applicationRepository.findByUserIdOrderByCreatedAtDesc(candidate.id()), false);
    }

    public List<InterviewResponse> getMyInterviews(AccountPrincipal candidate) {
        return interviewRepository.findForCandidate(candidate.id()).stream()
                .map(assembler::toInterviewResponse)
                .toList();
    }

    /**
     * One page of the recruiter's applicants, newest first. {@code search} matches the job title, and the
     * name/email only of candidates the recruiter has already unlocked (masked identities stay unsearchable).
     */
    public PageResponse<ApplicationResponse> getApplicants(
            AccountPrincipal recruiter, int page, int size, String search, Long jobId) {
        String query = search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);
        Collection<Long> matchingUserIds = query != null ? findUnlockedCandidates(recruiter.id(), query) : List.of();
        Page<Application> result = applicationRepository.searchForRecruiter(
                recruiter.id(), jobId,
                query != null ? LikePatterns.contains(query) : null,
                matchingUserIds.isEmpty() ? List.of(-1L) : matchingUserIds,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                        Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.<ApplicationResponse>builder()
                .content(assembler.toResponses(result.getContent(), true))
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private Collection<Long> findUnlockedCandidates(Long recruiterId, String query) {
        List<Long> unlocked = applicationRepository.findViewedCandidateIdsForRecruiter(recruiterId);
        if (unlocked.isEmpty()) return List.of();
        try {
            return remoteCalls.call("auth-service", () -> authServiceClient.searchUsers(new UserSearch(query, unlocked)));
        } catch (RuntimeException e) {
            log.warn("Candidate name search unavailable, searching job titles only: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * job.deleted: the candidates keep their application history, active ones are closed as JOB_REMOVED
     * (and told via a status-change notification), and the recruiter no longer sees them.
     */
    public int closeApplicationsForRemovedJob(Long jobId) {
        Integer closed = transactionTemplate.execute(tx -> {
            interviewRepository.cancelScheduledForJob(jobId);
            int count = 0;
            for (Application app : applicationRepository.findByJobId(jobId)) {
                if (ACTIVE_STATUSES.contains(app.getStatus())) {
                    app.setStatus(STATUS_JOB_REMOVED);
                    eventPublisher.publish(EventTopics.APPLICATION_STATUS_CHANGED, new Events.ApplicationStatusChanged(
                            app.getId(), app.getUserId(), app.getJobTitle(), STATUS_JOB_REMOVED));
                    count++;
                }
                app.setRecruiterId(null);
                applicationRepository.save(app);
            }
            return count;
        });
        return closed != null ? closed : 0;
    }

    /** account.deleted: a candidate's applications and interviews are erased (a recruiter's go via job.deleted). */
    public int removeAccountData(Events.AccountDeleted event) {
        if (event.accountType() != AccountType.USER) return 0;
        Integer removed = transactionTemplate.execute(tx -> {
            interviewRepository.deleteByUserId(event.accountId());
            return applicationRepository.deleteByUserId(event.accountId());
        });
        return removed != null ? removed : 0;
    }

    public ApplicationDetailResponse getApplicationDetail(Long id, AccountPrincipal requester) {
        Application app = getApplication(id);
        boolean isOwner = requester.isUser() && app.getUserId().equals(requester.id());
        boolean isJobOwner = requester.isAdmin() && requester.id().equals(app.getRecruiterId());
        if (!isOwner && !isJobOwner) {
            throw new ResourceNotFoundException("Application not found");
        }

        if (isJobOwner && !Boolean.TRUE.equals(app.getRecruiterViewed())) {
            app.setRecruiterViewed(true);
            app = applicationRepository.save(app);
        }

        UserSummary user = authServiceClient.getUser(app.getUserId());
        JobSummary job = fetchJobOrNull(app.getJobId());
        MatchBreakdownResponse breakdown = null;
        if (job != null) {
            breakdown = matchOrNull(MatchInput.of(job, user, activeApplicantCount(app.getJobId())));
        }
        return assembler.toDetail(app, job, user, breakdown);
    }

    public ApplicationResponse updateStatus(Long id, String status, AccountPrincipal recruiter) {
        Application app = getApplication(id);
        assertJobOwner(app, recruiter);
        if (status == null || !RECRUITER_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid status. Allowed: " + String.join(", ", RECRUITER_STATUSES));
        }
        assertNotWithdrawn(app);
        if (status.equals(app.getStatus())) {
            return assembler.toResponses(List.of(app), false).get(0);
        }
        if (STATUS_INTERVIEW_SCHEDULED.equals(status)) {
            throw new BadRequestException("Schedule an interview to move this application to Interview Scheduled");
        }
        if (!STATUS_TRANSITIONS.getOrDefault(app.getStatus(), Set.of()).contains(status)) {
            throw new BadRequestException("Can't change an application from " + label(app.getStatus())
                    + " to " + label(status));
        }

        Application saved = transactionTemplate.execute(tx -> {
            if (CLOSES_INTERVIEWS.contains(status)) {
                interviewRepository.cancelScheduledForApplication(app.getId());
            }
            app.setStatus(status);
            Application updated = applicationRepository.save(app);
            eventPublisher.publish(EventTopics.APPLICATION_STATUS_CHANGED, new Events.ApplicationStatusChanged(
                    updated.getId(), updated.getUserId(), updated.getJobTitle(), status));
            return updated;
        });
        return assembler.toResponses(List.of(saved), false).get(0);
    }

    private static String label(String status) {
        return status.replace('_', ' ').toLowerCase(Locale.ROOT);
    }

    public void withdraw(Long id, AccountPrincipal candidate) {
        Application app = getApplication(id);
        if (!app.getUserId().equals(candidate.id())) {
            throw new ResourceNotFoundException("Application not found");
        }
        if (!ACTIVE_STATUSES.contains(app.getStatus())) {
            throw new BadRequestException("This application can no longer be withdrawn");
        }
        transactionTemplate.executeWithoutResult(tx -> {
            interviewRepository.cancelScheduledForApplication(app.getId());
            app.setStatus(STATUS_WITHDRAWN);
            applicationRepository.save(app);
            if (app.getRecruiterId() != null) {
                eventPublisher.publish(EventTopics.APPLICATION_WITHDRAWN, new Events.ApplicationWithdrawn(
                        app.getId(), app.getRecruiterId(), app.getJobTitle()));
            }
        });
    }

    /** Schedules (or reschedules, replacing the current one) the interview for an active application. */
    public void scheduleInterview(InterviewRequest request, AccountPrincipal recruiter) {
        Application app = getApplication(request.getApplicationId());
        assertJobOwner(app, recruiter);
        assertNotWithdrawn(app);
        if (!SCHEDULABLE_STATUSES.contains(app.getStatus())) {
            throw new BadRequestException("Interviews can't be scheduled for " + label(app.getStatus()) + " applications");
        }

        transactionTemplate.executeWithoutResult(tx -> {
            interviewRepository.cancelScheduledForApplication(app.getId());
            Interview interview = interviewRepository.save(Interview.builder()
                    .application(app)
                    .scheduledAt(request.getScheduledAt())
                    .location(request.getLocation())
                    .notes(request.getNotes())
                    .build());
            app.setStatus(STATUS_INTERVIEW_SCHEDULED);
            applicationRepository.save(app);
            eventPublisher.publish(EventTopics.INTERVIEW_SCHEDULED, new Events.InterviewScheduled(
                    interview.getId(), app.getId(), app.getUserId(), app.getJobTitle(), request.getScheduledAt()));
        });
    }

    private Application getApplication(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }

    private Integer scoreOrNull(JobSummary job, UserSummary user, long applicantCount) {
        MatchBreakdownResponse breakdown = matchOrNull(MatchInput.of(job, user, applicantCount));
        return breakdown != null ? breakdown.getOverallScore() : null;
    }

    private MatchBreakdownResponse matchOrNull(MatchInput input) {
        try {
            return remoteCalls.call("ai-service", () -> aiServiceClient.match(input));
        } catch (RuntimeException e) {
            log.warn("Match scoring unavailable: {}", e.getMessage());
            return null;
        }
    }

    private JobSummary fetchJobOrNull(Long jobId) {
        try {
            return remoteCalls.call("job-service", () -> jobServiceClient.getJob(jobId));
        } catch (RuntimeException e) {
            log.warn("Job {} details unavailable: {}", jobId, e.getMessage());
            return null;
        }
    }

    private void assertJobOwner(Application app, AccountPrincipal recruiter) {
        if (!recruiter.id().equals(app.getRecruiterId())) {
            throw new ResourceNotFoundException("Application not found");
        }
    }

    private void assertNotWithdrawn(Application app) {
        if (STATUS_WITHDRAWN.equals(app.getStatus())) {
            throw new BadRequestException("The candidate has withdrawn this application");
        }
    }
}
