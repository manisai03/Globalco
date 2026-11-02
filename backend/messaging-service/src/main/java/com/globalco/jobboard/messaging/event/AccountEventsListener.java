package com.globalco.jobboard.messaging.event;

import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import com.globalco.jobboard.common.event.MessagingConfig;
import com.globalco.jobboard.messaging.repository.MessageRepository;
import com.globalco.jobboard.messaging.websocket.ChatSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Erases every conversation a deleted account took part in and closes its open chat sockets. */
@Slf4j
@Component
@RequiredArgsConstructor
@RabbitListener(queues = AccountEventsListener.QUEUE)
public class AccountEventsListener {

    static final String QUEUE = "messaging-service.account-events";

    private final MessageRepository messageRepository;
    private final ChatSessionRegistry chatSessions;

    @RabbitHandler
    @Transactional
    public void onAccountDeleted(Events.AccountDeleted event) {
        chatSessions.closeAll(event.accountType(), event.accountId());
        int deleted = messageRepository.deleteAllForAccount(event.accountType(), event.accountId());
        log.info("Deleted {} messages of deleted {} account {}", deleted, event.accountType(), event.accountId());
    }

    @Configuration
    static class QueueConfig {
        @Bean
        Declarables messagingServiceQueue() {
            return MessagingConfig.consumerQueue(QUEUE, EventTopics.ACCOUNT_DELETED);
        }
    }
}
