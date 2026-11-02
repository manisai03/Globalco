package com.globalco.jobboard.job.event;

import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.event.MessagingConfig;
import com.globalco.jobboard.job.service.JobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@RabbitListener(queues = RecruiterEventsListener.QUEUE)
public class RecruiterEventsListener {

    static final String QUEUE = "job-service.recruiter-events";

    private final JobService jobService;

    @RabbitHandler
    public void onRecruiterUpdated(Events.RecruiterUpdated event) {
        jobService.refreshRecruiterSnapshot(event);
        log.info("Refreshed recruiter snapshot on jobs for recruiter {}", event.recruiterId());
    }

    @RabbitHandler
    public void onAccountDeleted(Events.AccountDeleted event) {
        jobService.removeAccountData(event);
        log.info("Removed job data of deleted {} account {}", event.accountType(), event.accountId());
    }

    @Configuration
    static class QueueConfig {
        @Bean
        Declarables jobServiceQueue() {
            return MessagingConfig.consumerQueue(QUEUE, EventTopics.RECRUITER_UPDATED, EventTopics.ACCOUNT_DELETED);
        }
    }
}
