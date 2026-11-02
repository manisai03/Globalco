package com.globalco.jobboard.common.event.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.event.EventTopics;
import com.globalco.jobboard.common.event.Events;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpTimeoutException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitOperations;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JdbcEventOutboxTest {

    private JdbcTemplate jdbc;
    private TransactionTemplate tx;
    private RabbitOperations broker;
    private JdbcEventOutbox outbox;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                CREATE TABLE event_outbox (
                  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                  routing_key VARCHAR(100) NOT NULL,
                  event_type VARCHAR(200) NOT NULL,
                  payload TEXT NOT NULL,
                  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL)
                """);
        DataSourceTransactionManager txManager = new DataSourceTransactionManager(dataSource);
        tx = new TransactionTemplate(txManager);

        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        broker = mock(RabbitOperations.class);
        when(rabbitTemplate.invoke(any(RabbitOperations.OperationsCallback.class))).thenAnswer(inv ->
                inv.<RabbitOperations.OperationsCallback<?>>getArgument(0).doInRabbit(broker));

        outbox = new JdbcEventOutbox(jdbc, rabbitTemplate, new ObjectMapper().findAndRegisterModules(), txManager, "test-service");
    }

    @Test
    void deliversStoredEventsInOrderAndDeletesThem() {
        Events.JobCreated created = new Events.JobCreated(1L, 9L, "Java Developer");
        Events.InterviewScheduled interview = new Events.InterviewScheduled(
                3L, 4L, 5L, "Java Developer", LocalDateTime.of(2026, 11, 20, 10, 30));
        outbox.store(EventTopics.JOB_CREATED, created);
        outbox.store(EventTopics.INTERVIEW_SCHEDULED, interview);

        assertThat(outbox.flush()).isEqualTo(2);

        var order = inOrder(broker);
        order.verify(broker).convertAndSend(eq(EventTopics.EXCHANGE), eq(EventTopics.JOB_CREATED), eq(created), any(MessagePostProcessor.class));
        order.verify(broker).convertAndSend(eq(EventTopics.EXCHANGE), eq(EventTopics.INTERVIEW_SCHEDULED), eq(interview), any(MessagePostProcessor.class));
        assertThat(pending()).isZero();
    }

    @Test
    void eventFromRolledBackTransactionIsNeverStored() {
        tx.executeWithoutResult(status -> {
            outbox.store(EventTopics.JOB_DELETED, new Events.JobDeleted(1L));
            status.setRollbackOnly();
        });

        assertThat(pending()).isZero();
        assertThat(outbox.flush()).isZero();
    }

    @Test
    void keepsEventsWhileTheBrokerIsDownAndDeliversThemLater() {
        outbox.store(EventTopics.JOB_DELETED, new Events.JobDeleted(1L));
        doThrow(new AmqpTimeoutException("no confirm")).when(broker).waitForConfirmsOrDie(anyLong());

        assertThat(outbox.flush()).isZero();
        assertThat(pending()).isEqualTo(1);

        doNothing().when(broker).waitForConfirmsOrDie(anyLong());
        assertThat(outbox.flush()).isEqualTo(1);
        assertThat(pending()).isZero();
    }

    @Test
    void dropsRowsThatCanNeverBeDeserialized() {
        jdbc.update("INSERT INTO event_outbox (routing_key, event_type, payload) VALUES (?, ?, ?)",
                "job.deleted", "java.lang.ProcessBuilder", "{}");

        assertThat(outbox.flush()).isZero();

        assertThat(pending()).isZero();
        verify(broker, never()).convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));
    }

    @Test
    void stampsAStableMessageIdSoConsumersCanDropRedeliveries() throws Exception {
        outbox.store(EventTopics.JOB_DELETED, new Events.JobDeleted(1L));
        Long rowId = jdbc.queryForObject("SELECT id FROM event_outbox", Long.class);
        var captor = org.mockito.ArgumentCaptor.forClass(MessagePostProcessor.class);

        outbox.flush();

        verify(broker).convertAndSend(eq(EventTopics.EXCHANGE), eq(EventTopics.JOB_DELETED), any(Object.class), captor.capture());
        Message message = captor.getValue().postProcessMessage(new Message(new byte[0], new MessageProperties()));
        assertThat(message.getMessageProperties().getMessageId()).isEqualTo("test-service:" + rowId);
    }

    private int pending() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM event_outbox", Integer.class);
        return count != null ? count : 0;
    }
}
