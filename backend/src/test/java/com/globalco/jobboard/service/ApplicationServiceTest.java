package com.globalco.jobboard.service;

import com.globalco.jobboard.dto.request.ApplicationRequest;
import com.globalco.jobboard.exception.BadRequestException;
import com.globalco.jobboard.model.Admin;
import com.globalco.jobboard.model.Application;
import com.globalco.jobboard.model.Job;
import com.globalco.jobboard.model.User;
import com.globalco.jobboard.repository.ApplicationRepository;
import com.globalco.jobboard.repository.InterviewRepository;
import com.globalco.jobboard.repository.JobRepository;
import com.globalco.jobboard.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private JobRepository jobRepository;
    @Mock private UserRepository userRepository;
    @Mock private InterviewRepository interviewRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private NotificationService notificationService;
    @Spy private AiService aiService = new AiService();

    @InjectMocks
    private ApplicationService applicationService;

    private Admin recruiter;
    private User candidate;
    private Job job;

    @BeforeEach
    void setUp() {
        recruiter = Admin.builder().id(10L).email("recruiter@xpo.com").fullName("Rita Recruiter").build();
        candidate = User.builder().id(20L).email("cand@example.com").fullName("Carl Candidate").skills("Java").build();
        job = Job.builder().id(30L).title("Java Developer").company("XPO").location("Hyderabad")
                .jobType("FULL_TIME").description("desc").skills("Java").status("OPEN")
                .createdBy(recruiter).createdAt(LocalDateTime.now()).build();
    }

    private Application application(String status) {
        return Application.builder().id(40L).job(job).user(candidate).status(status).build();
    }

    @Test
    void updateStatusRejectsUnknownOrMissingStatus() {
        when(applicationRepository.findById(40L)).thenReturn(Optional.of(application("PENDING")));

        assertThrows(BadRequestException.class, () -> applicationService.updateStatus(40L, "BOGUS", recruiter));
        assertThrows(BadRequestException.class, () -> applicationService.updateStatus(40L, null, recruiter));
        assertThrows(BadRequestException.class, () -> applicationService.updateStatus(40L, "WITHDRAWN", recruiter));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void updateStatusRejectsWithdrawnApplication() {
        when(applicationRepository.findById(40L)).thenReturn(Optional.of(application("WITHDRAWN")));

        assertThrows(BadRequestException.class, () -> applicationService.updateStatus(40L, "SHORTLISTED", recruiter));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void updateStatusAcceptsValidStatus() {
        Application app = application("PENDING");
        when(applicationRepository.findById(40L)).thenReturn(Optional.of(app));
        when(applicationRepository.save(app)).thenReturn(app);

        applicationService.updateStatus(40L, "SHORTLISTED", recruiter);

        assertEquals("SHORTLISTED", app.getStatus());
    }

    @Test
    void withdrawRejectsFinalStatuses() {
        when(applicationRepository.findById(40L)).thenReturn(Optional.of(application("HIRED")));

        assertThrows(BadRequestException.class, () -> applicationService.withdraw(40L, candidate));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void applyRejectsActiveDuplicateApplication() {
        when(jobRepository.findById(30L)).thenReturn(Optional.of(job));
        when(applicationRepository.findByJobIdAndUserId(30L, 20L)).thenReturn(Optional.of(application("PENDING")));

        assertThrows(BadRequestException.class,
                () -> applicationService.apply(30L, new ApplicationRequest(), null, candidate));
    }

    @Test
    void applyReopensWithdrawnApplicationUsingPerJobApplicantCount() {
        Application withdrawn = application("WITHDRAWN");
        withdrawn.setRecruiterViewed(true);
        when(jobRepository.findById(30L)).thenReturn(Optional.of(job));
        when(applicationRepository.findByJobIdAndUserId(30L, 20L)).thenReturn(Optional.of(withdrawn));
        when(applicationRepository.countByJobId(30L)).thenReturn(3L);
        when(applicationRepository.save(withdrawn)).thenReturn(withdrawn);

        applicationService.apply(30L, new ApplicationRequest(), null, candidate);

        assertEquals("PENDING", withdrawn.getStatus());
        assertFalse(withdrawn.getRecruiterViewed());
        verify(applicationRepository).save(withdrawn);
        verify(applicationRepository, never()).count();
        verify(aiService).calculateMatchBreakdown(job, candidate, 3L);
    }
}
