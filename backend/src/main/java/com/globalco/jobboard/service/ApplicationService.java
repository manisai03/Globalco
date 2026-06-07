package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ApplicationRequest;
import com.globalco.jobboard.dto.request.InterviewRequest;
import com.globalco.jobboard.dto.response.ApplicationDetailResponse;
import com.globalco.jobboard.dto.response.ApplicationResponse;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.exception.ResourceNotFoundException;
import com.globalco.jobboard.mapper.EntityMapper;
import com.globalco.jobboard.model.Application;
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

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final AiService aiService;

    @Transactional
    public ApplicationResponse apply(Long jobId, ApplicationRequest request, MultipartFile resume, User user) {
        if ("ROLE_ADMIN".equals(user.getRole().getName())) {
            throw new BadRequestException("Recruiters cannot apply for jobs. Browse jobs to view market listings.");
        }

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (!"OPEN".equals(job.getStatus())) {
            throw new BadRequestException("This job is no longer accepting applications");
        }
        if (applicationRepository.existsByJobIdAndUserId(jobId, user.getId())) {
            throw new BadRequestException("You have already applied for this job");
        }

        String resumeUrl = user.getResumeUrl();
        if (resume != null && !resume.isEmpty()) {
            resumeUrl = fileStorageService.store(resume, "resumes");
            user.setResumeUrl(resumeUrl);
            userRepository.save(user);
        }

        long applicantCount = applicationRepository.count();
        var matchBreakdown = aiService.calculateMatchBreakdown(job, user, applicantCount);
        int matchScore = matchBreakdown.getOverallScore();

        Application application = Application.builder()
                .job(job)
                .user(user)
                .resumeUrl(resumeUrl)
                .coverLetter(request != null ? request.getCoverLetter() : null)
                .matchScore(matchScore)
                .build();

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

    public List<ApplicationResponse> getJobApplicants(Long jobId) {
        return applicationRepository.findByJobIdOrderByCreatedAtDesc(jobId).stream()
                .map(EntityMapper::toApplicationResponse)
                .toList();
    }

    public List<ApplicationResponse> getAllApplicants(User admin) {
        return applicationRepository.findByJobCreatedByIdOrderByCreatedAtDesc(admin.getId()).stream()
                .map(EntityMapper::toApplicationResponse)
                .toList();
    }

    public ApplicationDetailResponse getApplicationDetail(Long id, User requester) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        boolean isOwner = app.getUser().getId().equals(requester.getId());
        boolean isAdmin = "ROLE_ADMIN".equals(requester.getRole().getName());
        boolean isJobOwner = isAdmin && app.getJob().getCreatedBy() != null
                && app.getJob().getCreatedBy().getId().equals(requester.getId());
        if (!isOwner && !isJobOwner) {
            throw new BadRequestException("Not authorized to view this application");
        }

        long jobApplicantCount = applicationRepository.findByJobIdOrderByCreatedAtDesc(app.getJob().getId()).size();
        var matchBreakdown = aiService.calculateMatchBreakdown(app.getJob(), app.getUser(), jobApplicantCount);
        return EntityMapper.toApplicationDetailResponse(app, matchBreakdown);
    }

    @Transactional
    public ApplicationResponse updateStatus(Long id, String status, User admin) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        assertJobOwner(app.getJob(), admin);

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
        app.setStatus("WITHDRAWN");
        applicationRepository.save(app);
    }

    @Transactional
    public void scheduleInterview(InterviewRequest request, User admin) {
        Application app = applicationRepository.findById(request.getApplicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
        assertJobOwner(app.getJob(), admin);

        Interview interview = Interview.builder()
                .application(app)
                .scheduledAt(request.getScheduledAt())
                .location(request.getLocation())
                .notes(request.getNotes())
                .build();
        interviewRepository.save(interview);

        app.setStatus("INTERVIEW_SCHEDULED");
        applicationRepository.save(app);

        notificationService.create(app.getUser(), "Interview Scheduled",
                "Interview scheduled for " + app.getJob().getTitle() + " on " + request.getScheduledAt(),
                "INTERVIEW_SCHEDULED", interview.getId());
    }

    private void assertJobOwner(Job job, User admin) {
        if (job.getCreatedBy() == null || !job.getCreatedBy().getId().equals(admin.getId())) {
            throw new BadRequestException("You can only manage applicants for your own job postings");
        }
    }
}
