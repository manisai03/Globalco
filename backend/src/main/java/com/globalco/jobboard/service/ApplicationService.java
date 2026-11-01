package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ApplicationRequest;
import com.globalco.jobboard.dto.request.InterviewRequest;
import com.globalco.jobboard.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.dto.response.ApplicationResponse;
import com.globalco.jobboard.dto.response.InterviewResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Application;
import com.globalco.jobboard.model.AuthenticatedAccount;
import com.globalco.jobboard.model.Interview;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.repository.InterviewRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    static final String STATUS_PENDING = "PENDING";
    static final String STATUS_INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED";
    static final String STATUS_WITHDRAWN = "WITHDRAWN";
    static final List<String> RECRUITER_STATUSES =
            List.of(STATUS_PENDING, "SHORTLISTED", STATUS_INTERVIEW_SCHEDULED, "REJECTED", "HIRED");
    private static final Set<String> WITHDRAWABLE_STATUSES =
            Set.of(STATUS_PENDING, "SHORTLISTED", STATUS_INTERVIEW_SCHEDULED);

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final AiService aiService;

    @Transactional
    public ApplicationResponse apply(Long jobId, ApplicationRequest request, MultipartFile resume, User user) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (!"OPEN".equals(job.getStatus())) {
            throw new BadRequestException("This job is no longer accepting applications");
        }
        Application application = applicationRepository.findByJobIdAndUserId(jobId, user.getId()).orElse(null);
        if (application != null && !STATUS_WITHDRAWN.equals(application.getStatus())) {
            throw new BadRequestException("You have already applied for this job");
        }

        String resumeUrl = user.getResumeUrl();
        if (resume != null && !resume.isEmpty()) {
            resumeUrl = fileStorageService.store(resume, "resumes", FileStorageService.RESUME_EXTENSIONS);
            user.setResumeUrl(resumeUrl);
            userRepository.save(user);
        }

        long applicantCount = applicationRepository.countByJobId(jobId);
        var matchBreakdown = aiService.calculateMatchBreakdown(job, user, applicantCount);
        int matchScore = matchBreakdown.getOverallScore();
        String coverLetter = request != null ? request.getCoverLetter() : null;

        if (application == null) {
            application = Application.builder()
                    .job(job)
                    .user(user)
                    .build();
        }
        // The (job_id, user_id) unique constraint means a withdrawn application is reopened, not duplicated.
        application.setResumeUrl(resumeUrl);
        application.setCoverLetter(coverLetter);
        application.setMatchScore(matchScore);
        application.setStatus(STATUS_PENDING);
        application.setRecruiterViewed(false);

        Application saved = applicationRepository.save(application);

        notificationService.create(user, "Application Submitted",
                "Your application for " + job.getTitle() + " has been submitted.", "APPLICATION_SUBMITTED", saved.getId());

        if (job.getCreatedBy() != null) {
            notificationService.create(job.getCreatedBy(), "New Application",
                    user.getFullName() + " applied for " + job.getTitle(), "NEW_APPLICATION", saved.getId());
        }

        return EntityMapper.toApplicationResponse(saved);
    }

    public List<ApplicationResponse> getMyApplications(User user) {
        return applicationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(EntityMapper::toApplicationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InterviewResponse> getMyInterviews(User user) {
        return interviewRepository.findByApplicationUserIdOrderByScheduledAtAsc(user.getId()).stream()
                .map(EntityMapper::toInterviewResponse)
                .toList();
    }

    public List<ApplicationResponse> getAllApplicants(Admin admin) {
        return applicationRepository.findByJobCreatedByIdOrderByCreatedAtDesc(admin.getId()).stream()
                .map(app -> EntityMapper.toApplicationResponse(app, true))
                .toList();
    }

    @Transactional
    public ApplicationDetailResponse getApplicationDetail(Long id, AuthenticatedAccount requester) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        boolean isOwner = requester instanceof User user && app.getUser().getId().equals(user.getId());
        boolean isJobOwner = requester instanceof Admin admin
                && app.getJob().getCreatedBy() != null
                && app.getJob().getCreatedBy().getId().equals(admin.getId());
        if (!isOwner && !isJobOwner) {
            throw new BadRequestException("Not authorized to view this application");
        }

        if (isJobOwner && !Boolean.TRUE.equals(app.getRecruiterViewed())) {
            app.setRecruiterViewed(true);
            applicationRepository.save(app);
        }

        long jobApplicantCount = applicationRepository.countByJobId(app.getJob().getId());
        var matchBreakdown = aiService.calculateMatchBreakdown(app.getJob(), app.getUser(), jobApplicantCount);
        return EntityMapper.toApplicationDetailResponse(app, matchBreakdown);
    }

    @Transactional
    public ApplicationResponse updateStatus(Long id, String status, Admin admin) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        assertJobOwner(app.getJob(), admin);
        if (status == null || !RECRUITER_STATUSES.contains(status)) {
            throw new BadRequestException("Invalid status. Allowed: " + String.join(", ", RECRUITER_STATUSES));
        }
        assertNotWithdrawn(app);

        app.setStatus(status);
        Application saved = applicationRepository.save(app);

        notificationService.create(saved.getUser(), "Application Update",
                "Your application for " + saved.getJob().getTitle() + " is now " + status + ".",
                "STATUS_UPDATE", saved.getId());

        return EntityMapper.toApplicationResponse(saved);
    }

    @Transactional
    public void withdraw(Long id, User user) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        if (!app.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Not authorized");
        }
        if (!WITHDRAWABLE_STATUSES.contains(app.getStatus())) {
            throw new BadRequestException("This application can no longer be withdrawn");
        }
        app.setStatus(STATUS_WITHDRAWN);
        applicationRepository.save(app);
    }

    @Transactional
    public void scheduleInterview(InterviewRequest request, Admin admin) {
        Application app = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        assertJobOwner(app.getJob(), admin);
        assertNotWithdrawn(app);

        Interview interview = Interview.builder()
                .application(app)
                .scheduledAt(request.getScheduledAt())
                .location(request.getLocation())
                .notes(request.getNotes())
                .build();
        interviewRepository.save(interview);

        app.setStatus(STATUS_INTERVIEW_SCHEDULED);
        applicationRepository.save(app);

        notificationService.create(app.getUser(), "Interview Scheduled",
                "Interview scheduled for " + app.getJob().getTitle() + " on " + request.getScheduledAt(),
                "INTERVIEW_SCHEDULED", interview.getId());
    }

    private void assertJobOwner(Job job, Admin admin) {
        if (job.getCreatedBy() == null || !job.getCreatedBy().getId().equals(admin.getId())) {
            throw new BadRequestException("You can only manage applicants for your own job postings");
        }
    }

    private void assertNotWithdrawn(Application app) {
        if (STATUS_WITHDRAWN.equals(app.getStatus())) {
            throw new BadRequestException("The candidate has withdrawn this application");
        }
    }
}
