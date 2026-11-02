package com.globalco.jobboard.job.service;

import com.globalco.jobboard.common.event.EventPublisher;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.security.AccountPrincipal;
import com.globalco.jobboard.common.security.AccountType;
import com.globalco.jobboard.job.model.Job;
import com.globalco.jobboard.job.model.SavedSearch;
import com.globalco.jobboard.job.repository.JobRepository;
import com.globalco.jobboard.job.repository.SavedSearchRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SavedSearchServiceTest {

    private final SavedSearchRepository searches = mock(SavedSearchRepository.class);
    private final EventPublisher events = mock(EventPublisher.class);
    private final SavedSearchService service = new SavedSearchService(searches, mock(JobRepository.class), events);

    private static Job job() {
        return Job.builder().id(5L).title("Senior Java Developer").company("Acme").location("Hyderabad, India")
                .description("Spring Boot microservices").skills("Java, Spring").jobType("Full-time")
                .category("Engineering").salaryMax(new BigDecimal("1800000")).build();
    }

    private static SavedSearch search(long id, long userId, String text) {
        return SavedSearch.builder().id(id).userId(userId).name("alert " + id).search(text).build();
    }

    @Test
    void matcherAppliesEverySavedFilter() {
        Job job = job();
        assertThat(JobAlertMatcher.matches(search(1, 7, "java spring"), job)).isTrue();
        assertThat(JobAlertMatcher.matches(search(1, 7, "python"), job)).isFalse();

        SavedSearch byLocation = search(2, 7, null);
        byLocation.setLocation("hyderabad");
        assertThat(JobAlertMatcher.matches(byLocation, job)).isTrue();
        byLocation.setLocation("Pune");
        assertThat(JobAlertMatcher.matches(byLocation, job)).isFalse();

        SavedSearch bySalary = search(3, 7, null);
        bySalary.setMinSalary(new BigDecimal("2000000"));
        assertThat(JobAlertMatcher.matches(bySalary, job)).isFalse();

        job.setStatus("CLOSED");
        assertThat(JobAlertMatcher.matches(search(1, 7, "java"), job)).isFalse();
    }

    @Test
    void newJobSendsOneAlertPerMatchingCandidate() {
        when(searches.findByAlertsEnabledTrue()).thenReturn(List.of(
                search(1, 7, "java"), search(2, 7, "spring"), search(3, 8, "go"), search(4, 9, "developer")));

        service.announceNewJob(job());

        verify(events).publish(EventTopics.JOB_ALERT_MATCHED,
                new Events.JobAlertMatched(7L, 5L, "Senior Java Developer", "Acme", "alert 1"));
        verify(events).publish(EventTopics.JOB_ALERT_MATCHED,
                new Events.JobAlertMatched(9L, 5L, "Senior Java Developer", "Acme", "alert 4"));
        verify(events, times(2)).publish(any(), any());
    }

    @Test
    void candidatesCanOnlyToggleTheirOwnAlerts() {
        AccountPrincipal other = new AccountPrincipal(8L, "o@x.com", AccountType.USER, "O");
        when(searches.findById(1L)).thenReturn(Optional.of(search(1, 7, "java")));

        assertThatThrownBy(() -> service.setAlertsEnabled(1L, false, other))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(searches, never()).save(any());
    }
}
