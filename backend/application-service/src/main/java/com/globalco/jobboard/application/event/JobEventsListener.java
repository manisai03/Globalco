package com.globalco.jobboard.application.event;

import com.globalco.jobboard.application.repository.ApplicationRepository;
import com.globalco.jobboard.application.service.ApplicationService;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.event.MessagingConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@RabbitListener(queues = JobEventsListener.QUEUE)
public class JobEventsListener {

    static final String QUEUE = "application-service.job-events";

    private final ApplicationRepository applicationRepository;
    private final ApplicationService applicationService;

    @RabbitHandler
    @Transactional
    public void onJobUpdated(Events.JobUpdated event) {
        int updated = applicationRepository.updateJobSnapshot(event.jobId(), event.title(), event.company());
        log.debug("Refreshed job snapshot on {} applications for job {}", updated, event.jobId());
    }

    /** Applications are kept as the candidate's history; they are closed and the candidates are told. */
    @RabbitHandler
    public void onJobDeleted(Events.JobDeleted event) {
        int closed = applicationService.closeApplicationsForRemovedJob(event.jobId());
        log.info("Closed {} applications for deleted job {}", closed, event.jobId());
    }

    @RabbitHandler
    public void onAccountDeleted(Events.AccountDeleted event) {
        int removed = applicationService.removeAccountData(event);
        log.info("Removed {} applications of deleted {} account {}", removed, event.accountType(), event.accountId());
    }

    @Configuration
    static class QueueConfig {
        @Bean
        Declarables applicationServiceQueue() {
            return MessagingConfig.consumerQueue(QUEUE,
                    EventTopics.JOB_UPDATED, EventTopics.JOB_DELETED, EventTopics.ACCOUNT_DELETED);
        }
    }
}
