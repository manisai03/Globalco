package com.globalco.jobboard.application.service;

import com.globalco.jobboard.application.model.Application;
import com.globalco.jobboard.application.model.Interview;
import com.globalco.jobboard.application.repository.ApplicationRepository;
import com.globalco.jobboard.application.repository.InterviewRepository;
import com.globalco.jobboard.common.client.AiServiceClient;
import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.client.JobServiceClient;
import com.globalco.jobboard.common.dto.internal.JobSummary;
import com.globalco.jobboard.common.dto.internal.UserSearch;
import com.globalco.jobboard.common.dto.internal.UserSummary;
import com.globalco.jobboard.common.dto.request.InterviewRequest;
import com.globalco.jobboard.common.dto.response.ApplicationResponse;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.feign.RemoteCalls;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationServiceTest {

    private static final class NoOpTransactionManager implements PlatformTransactionManager {
        @Override public TransactionStatus getTransaction(TransactionDefinition definition) { return new SimpleTransactionStatus(); }
        @Override public void commit(TransactionStatus status) { }
        @Override public void rollback(TransactionStatus status) { }
    }

    private final ApplicationRepository applications = mock(ApplicationRepository.class);
    private final InterviewRepository interviews = mock(InterviewRepository.class);
    private final AuthServiceClient auth = mock(AuthServiceClient.class);
    private final ApplicationAssembler assembler = mock(ApplicationAssembler.class);
    private final EventPublisher events = mock(EventPublisher.class);
    private final JobServiceClient jobsClient = mock(JobServiceClient.class);
    private final ApplicationService service = new ApplicationService(
            applications, interviews, jobsClient, auth, mock(AiServiceClient.class),
            assembler, events, new TransactionTemplate(new NoOpTransactionManager()), new RemoteCalls(50, 10, 20));

    private final AccountPrincipal recruiter = new AccountPrincipal(3L, "r@x.com", AccountType.ADMIN, "R");
    private final AccountPrincipal otherRecruiter = new AccountPrincipal(4L, "o@x.com", AccountType.ADMIN, "O");
    private final AccountPrincipal candidate = new AccountPrincipal(7L, "c@x.com", AccountType.USER, "C");

    private static Application app(long id, String status) {
        return Application.builder().id(id).jobId(10L).userId(7L).recruiterId(3L)
                .jobTitle("Dev").status(status).build();
    }

    @Test
    void removedJobClosesOnlyActiveApplicationsAndHidesAllFromRecruiter() {
        Application pending = app(1, "PENDING");
        Application hired = app(2, "HIRED");
        Application withdrawn = app(3, "WITHDRAWN");
        when(applications.findByJobId(10L)).thenReturn(List.of(pending, hired, withdrawn));

        int closed = service.closeApplicationsForRemovedJob(10L);

        assertThat(closed).isEqualTo(1);
        assertThat(pending.getStatus()).isEqualTo("JOB_REMOVED");
        assertThat(hired.getStatus()).isEqualTo("HIRED");
        assertThat(withdrawn.getStatus()).isEqualTo("WITHDRAWN");
        assertThat(List.of(pending, hired, withdrawn)).allMatch(a -> a.getRecruiterId() == null);
        verify(interviews).cancelScheduledForJob(10L);
        verify(events).publish(eq(EventTopics.APPLICATION_STATUS_CHANGED),
                eq(new Events.ApplicationStatusChanged(1L, 7L, "Dev", "JOB_REMOVED")));
    }

    @Test
    void recruiterCannotUpdateAnotherRecruitersApplicant() {
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "PENDING")));
        assertThatThrownBy(() -> service.updateStatus(1L, "SHORTLISTED", otherRecruiter))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(applications, never()).save(any());
    }

    @Test
    void statusChangesFollowTheTransitionTable() {
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "PENDING")));
        assertThatThrownBy(() -> service.updateStatus(1L, "HIRED", recruiter))
                .isInstanceOf(BadRequestException.class);

        when(applications.findById(2L)).thenReturn(Optional.of(app(2, "HIRED")));
        assertThatThrownBy(() -> service.updateStatus(2L, "PENDING", recruiter))
                .isInstanceOf(BadRequestException.class);

        when(applications.findById(3L)).thenReturn(Optional.of(app(3, "SHORTLISTED")));
        assertThatThrownBy(() -> service.updateStatus(3L, "INTERVIEW_SCHEDULED", recruiter))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Schedule an interview");
        verify(events, never()).publish(any(), any());
    }

    @Test
    void sameStatusIsANoOpWithoutNotification() {
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "SHORTLISTED")));
        when(assembler.toResponses(any(), eq(false))).thenReturn(List.of(ApplicationResponse.builder().build()));

        service.updateStatus(1L, "SHORTLISTED", recruiter);

        verify(applications, never()).save(any());
        verify(events, never()).publish(any(), any());
    }

    @Test
    void rejectingCancelsScheduledInterviews() {
        Application app = app(1, "INTERVIEW_SCHEDULED");
        when(applications.findById(1L)).thenReturn(Optional.of(app));
        when(applications.save(app)).thenReturn(app);
        when(assembler.toResponses(any(), eq(false))).thenReturn(List.of(ApplicationResponse.builder().build()));

        service.updateStatus(1L, "REJECTED", recruiter);

        assertThat(app.getStatus()).isEqualTo("REJECTED");
        verify(interviews).cancelScheduledForApplication(1L);
        verify(events).publish(eq(EventTopics.APPLICATION_STATUS_CHANGED),
                eq(new Events.ApplicationStatusChanged(1L, 7L, "Dev", "REJECTED")));
    }

    @Test
    void interviewsCanOnlyBeScheduledForActiveApplicationsAndReplaceTheCurrentOne() {
        InterviewRequest request = new InterviewRequest();
        request.setApplicationId(1L);
        request.setScheduledAt(LocalDateTime.now().plusDays(2));
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "REJECTED")));
        assertThatThrownBy(() -> service.scheduleInterview(request, recruiter))
                .isInstanceOf(BadRequestException.class);

        Application shortlisted = app(2, "SHORTLISTED");
        request.setApplicationId(2L);
        when(applications.findById(2L)).thenReturn(Optional.of(shortlisted));
        when(interviews.save(any(Interview.class))).thenAnswer(inv -> inv.getArgument(0));

        service.scheduleInterview(request, recruiter);

        assertThat(shortlisted.getStatus()).isEqualTo("INTERVIEW_SCHEDULED");
        verify(interviews).cancelScheduledForApplication(2L);
        verify(events).publish(eq(EventTopics.INTERVIEW_SCHEDULED), any(Events.InterviewScheduled.class));
    }

    @Test
    void withdrawingTellsTheRecruiterAndCancelsInterviews() {
        Application app = app(1, "INTERVIEW_SCHEDULED");
        when(applications.findById(1L)).thenReturn(Optional.of(app));

        service.withdraw(1L, candidate);

        assertThat(app.getStatus()).isEqualTo("WITHDRAWN");
        verify(interviews).cancelScheduledForApplication(1L);
        verify(events).publish(EventTopics.APPLICATION_WITHDRAWN, new Events.ApplicationWithdrawn(1L, 3L, "Dev"));
    }

    @Test
    void reapplyingIsAllowedOnceAndKeepsTheRecruiterUnlock() {
        JobSummary job = new JobSummary(10L, "Dev", "Co", "Hyd", "java", "Mid", "Full-time", "Eng", "OPEN", 3L, null);
        when(jobsClient.getJob(10L)).thenReturn(job);
        when(auth.getUser(7L)).thenReturn(new UserSummary(7L, "c@x.com", "C", null, null, null, "java", "/r.pdf"));
        Application withdrawn = app(1, "WITHDRAWN");
        withdrawn.setRecruiterViewed(true);
        when(applications.findByJobIdAndUserId(10L, 7L)).thenReturn(Optional.of(withdrawn));
        when(applications.save(withdrawn)).thenReturn(withdrawn);

        service.apply(10L, null, null, candidate);

        assertThat(withdrawn.getStatus()).isEqualTo("PENDING");
        assertThat(withdrawn.getReapplyCount()).isEqualTo(1);
        assertThat(withdrawn.getRecruiterViewed()).isTrue();

        withdrawn.setStatus("WITHDRAWN");
        assertThatThrownBy(() -> service.apply(10L, null, null, candidate))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("once");
    }

    @Test
    void uploadedResumeIsKeptPerApplicationAndRemovedWhenTheSaveFails() {
        JobSummary job = new JobSummary(10L, "Dev", "Co", "Hyd", "java", "Mid", "Full-time", "Eng", "OPEN", 3L, null);
        when(jobsClient.getJob(10L)).thenReturn(job);
        when(auth.getUser(7L)).thenReturn(new UserSummary(7L, "c@x.com", "C", null, null, null, "java", "/profile.pdf"));
        when(applications.findByJobIdAndUserId(10L, 7L)).thenReturn(Optional.empty());
        MockMultipartFile file = new MockMultipartFile("resume", "cv.pdf", "application/pdf", new byte[]{1});
        when(auth.uploadApplicationResume(7L, file)).thenReturn("/api/files/resumes/new.pdf");
        when(applications.save(any(Application.class))).thenThrow(new DataIntegrityViolationException("dup"));

        assertThatThrownBy(() -> service.apply(10L, "hi", file, candidate)).isInstanceOf(BadRequestException.class);

        verify(auth).deleteApplicationResume(7L, "/api/files/resumes/new.pdf");
    }

    @Test
    void invalidAndWithdrawnStatusUpdatesAreRejected() {
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "PENDING")));
        assertThatThrownBy(() -> service.updateStatus(1L, "JOB_REMOVED", recruiter))
                .isInstanceOf(BadRequestException.class);

        when(applications.findById(2L)).thenReturn(Optional.of(app(2, "WITHDRAWN")));
        assertThatThrownBy(() -> service.updateStatus(2L, "SHORTLISTED", recruiter))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void closedApplicationsCannotBeWithdrawn() {
        when(applications.findById(1L)).thenReturn(Optional.of(app(1, "JOB_REMOVED")));
        assertThatThrownBy(() -> service.withdraw(1L, candidate)).isInstanceOf(BadRequestException.class);

        Application pending = app(2, "PENDING");
        when(applications.findById(2L)).thenReturn(Optional.of(pending));
        service.withdraw(2L, candidate);
        assertThat(pending.getStatus()).isEqualTo("WITHDRAWN");
    }

    @Test
    void recruiterAccountDeletionLeavesApplicationsToJobDeletedEvents() {
        assertThat(service.removeAccountData(new Events.AccountDeleted(AccountType.ADMIN, 3L))).isZero();
        verify(applications, never()).deleteByUserId(anyLong());

        when(applications.deleteByUserId(7L)).thenReturn(2);
        assertThat(service.removeAccountData(new Events.AccountDeleted(AccountType.USER, 7L))).isEqualTo(2);
        verify(interviews).deleteByUserId(7L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void applicantSearchEscapesLikeAndOnlySearchesUnlockedCandidates() {
        Page<Application> empty = new PageImpl<>(List.of());
        when(applications.searchForRecruiter(anyLong(), any(), any(), any(), any(Pageable.class))).thenReturn(empty);
        when(applications.findViewedCandidateIdsForRecruiter(3L)).thenReturn(List.of(7L));
        when(auth.searchUsers(new UserSearch("50%_off", List.of(7L)))).thenReturn(List.of(7L));

        service.getApplicants(recruiter, 0, 500, " 50%_OFF ", null);

        ArgumentCaptor<String> like = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Collection<Long>> ids = ArgumentCaptor.forClass(Collection.class);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(applications).searchForRecruiter(eq(3L), isNull(), like.capture(), ids.capture(), pageable.capture());
        assertThat(like.getValue()).isEqualTo("%50\\%\\_off%");
        assertThat(ids.getValue()).containsExactly(7L);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(ApplicationService.MAX_PAGE_SIZE);
    }

    @Test
    void applicantListWithoutSearchSkipsAuthService() {
        when(applications.searchForRecruiter(anyLong(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        service.getApplicants(recruiter, 0, 20, "  ", 10L);
        verify(auth, never()).searchUsers(any());
        verify(applications).searchForRecruiter(eq(3L), eq(10L), isNull(), eq(List.of(-1L)), any(Pageable.class));
    }
}
