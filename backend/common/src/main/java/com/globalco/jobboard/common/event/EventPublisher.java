package com.globalco.jobboard.common.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

/**
 * Publishes integration events.
 * <ul>
 *   <li>Services with an outbox ({@code app.events.outbox.enabled=true}) write the event into their own
 *       database in the same transaction; the relay delivers it after commit and retries until RabbitMQ
 *       confirms it, so events survive broker outages and restarts (at-least-once delivery).</li>
 *   <li>Otherwise the event is sent after commit, best-effort.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectProvider<EventOutbox> outboxProvider;

    public void publish(String routingKey, Object event) {
        EventOutbox outbox = outboxProvider.getIfAvailable();
        if (outbox != null) {
            outbox.store(routingKey, event);
            afterCommit(outbox::flushAsync);
            return;
        }
        afterCommit(() -> send(routingKey, event));
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private void send(String routingKey, Object event) {
        try {
            String messageId = UUID.randomUUID().toString();
            rabbitTemplate.convertAndSend(EventTopics.EXCHANGE, routingKey, event, message -> {
                message.getMessageProperties().setMessageId(messageId);
                return message;
            });
            log.debug("Published {} -> {}", routingKey, event);
        } catch (AmqpException e) {
            log.error("Failed to publish {} ({}): {}", routingKey, event.getClass().getSimpleName(), e.getMessage());
        }
    }
}
