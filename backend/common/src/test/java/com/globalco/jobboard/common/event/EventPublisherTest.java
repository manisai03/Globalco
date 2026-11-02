package com.globalco.jobboard.common.event;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventPublisherTest {

    private final RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
    private final Events.JobDeleted event = new Events.JobDeleted(7L);

    @AfterEach
    void clearTransaction() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void withoutTransactionSendsImmediately() {
        publisher(null).publish(EventTopics.JOB_DELETED, event);

        verify(rabbitTemplate).convertAndSend(eq(EventTopics.EXCHANGE), eq(EventTopics.JOB_DELETED), eq(event), any(MessagePostProcessor.class));
    }

    @Test
    void insideTransactionSendsOnlyAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();

        publisher(null).publish(EventTopics.JOB_DELETED, event);
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(rabbitTemplate).convertAndSend(eq(EventTopics.EXCHANGE), eq(EventTopics.JOB_DELETED), eq(event), any(MessagePostProcessor.class));
    }

    @Test
    void brokerOutageDoesNotFailTheUsersRequest() {
        doThrow(new AmqpConnectException(new RuntimeException("connection refused")))
                .when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        assertThatCode(() -> publisher(null).publish(EventTopics.JOB_DELETED, event)).doesNotThrowAnyException();
    }

    @Test
    void withOutboxStoresInTheTransactionAndFlushesAfterCommit() {
        EventOutbox outbox = mock(EventOutbox.class);
        TransactionSynchronizationManager.initSynchronization();

        publisher(outbox).publish(EventTopics.JOB_DELETED, event);

        verify(outbox).store(EventTopics.JOB_DELETED, event);
        verify(outbox, never()).flushAsync();
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(outbox).flushAsync();
    }

    @Test
    void withOutboxAndRolledBackTransactionNothingIsFlushed() {
        EventOutbox outbox = mock(EventOutbox.class);
        TransactionSynchronizationManager.initSynchronization();

        publisher(outbox).publish(EventTopics.JOB_DELETED, event);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(outbox, never()).flushAsync();
        verify(rabbitTemplate, never()).convertAndSend(eq(EventTopics.EXCHANGE), anyString(), any(Object.class), any(MessagePostProcessor.class));
    }

    @SuppressWarnings("unchecked")
    private EventPublisher publisher(EventOutbox outbox) {
        ObjectProvider<EventOutbox> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(outbox);
        return new EventPublisher(rabbitTemplate, provider);
    }
}
