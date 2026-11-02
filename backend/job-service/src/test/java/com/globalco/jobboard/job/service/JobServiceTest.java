package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.client.AuthServiceClient;
import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.repository.JobRepository;
import com.globalco.jobboard.job.repository.SavedJobRepository;
import com.globalco.jobboard.job.repository.SavedSearchRepository;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JobServiceTest {

    private final JobRepository jobs = mock(JobRepository.class);
    private final SavedJobRepository savedJobs = mock(SavedJobRepository.class);
    private final SavedSearchRepository savedSearches = mock(SavedSearchRepository.class);
    private final EventPublisher events = mock(EventPublisher.class);
    private final JobService service = new JobService(jobs, savedJobs, mock(JobEnricher.class), savedSearches,
            mock(SavedSearchService.class), mock(AuthServiceClient.class), events, mock(TransactionTemplate.class));

    private final AccountPrincipal owner = new AccountPrincipal(3L, "r@x.com", AccountType.ADMIN, "R");
    private final AccountPrincipal other = new AccountPrincipal(4L, "o@x.com", AccountType.ADMIN, "O");

    private static Job job(long id) {
        Job job = new Job();
        job.setId(id);
        job.setRecruiterId(3L);
        job.setTitle("Dev");
        return job;
    }

    @Test
    void onlyTheOwnerCanDeleteAJob() {
        when(jobs.findById(1L)).thenReturn(Optional.of(job(1)));
        assertThatThrownBy(() -> service.deleteJob(1L, other)).isInstanceOf(ResourceNotFoundException.class);
        verify(jobs, never()).delete(any(Job.class));
        verify(events, never()).publish(any(), any());
    }

    @Test
    void deletingAJobPublishesJobDeleted() {
        Job job = job(1);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
        service.deleteJob(1L, owner);
        verify(savedJobs).deleteByJobId(1L);
        verify(jobs).delete(job);
        verify(events).publish(EventTopics.JOB_DELETED, new Events.JobDeleted(1L));
    }

    @Test
    void deletedRecruiterLosesAllPostings() {
        when(jobs.findByRecruiterIdOrderByCreatedAtDesc(3L)).thenReturn(List.of(job(1), job(2)));
        service.removeAccountData(new Events.AccountDeleted(AccountType.ADMIN, 3L));
        verify(events).publish(EventTopics.JOB_DELETED, new Events.JobDeleted(1L));
        verify(events).publish(EventTopics.JOB_DELETED, new Events.JobDeleted(2L));
    }

    @Test
    void deletedCandidateLosesSavedItems() {
        service.removeAccountData(new Events.AccountDeleted(AccountType.USER, 7L));
        verify(savedJobs).deleteByUserId(7L);
        verify(savedSearches).deleteByUserId(7L);
        verify(jobs, never()).findByRecruiterIdOrderByCreatedAtDesc(any());
    }
}
