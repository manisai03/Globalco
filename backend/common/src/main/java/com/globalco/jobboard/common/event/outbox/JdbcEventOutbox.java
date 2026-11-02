package com.globalco.jobboard.common.event.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.event.EventOutbox;
import com.globalco.jobboard.common.event.EventTopics;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Transactional outbox backed by the service's own {@code event_outbox} table (created by Flyway).
 * Rows are claimed with {@code FOR UPDATE SKIP LOCKED}, so several instances can relay in parallel without
 * sending the same row twice; a row is deleted only after RabbitMQ confirms the message.
 */
@Slf4j
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.events.outbox.enabled", havingValue = "true")
public class JdbcEventOutbox implements EventOutbox {

    static final int BATCH_SIZE = 50;
    static final String EVENT_PACKAGE_PREFIX = "com.globalco.jobboard.common.event.Events$";
    private static final long CONFIRM_TIMEOUT_MS = 5000;

    private final JdbcTemplate jdbcTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final String source;
    private final ReentrantLock flushLock = new ReentrantLock();
    private final ExecutorService flushExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "outbox-relay");
        thread.setDaemon(true);
        return thread;
    });

    public JdbcEventOutbox(JdbcTemplate jdbcTemplate, RabbitTemplate rabbitTemplate, ObjectMapper objectMapper,
                           PlatformTransactionManager transactionManager,
                           @Value("${spring.application.name:service}") String source) {
        this.jdbcTemplate = jdbcTemplate;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.source = source;
    }

    /** Stable across re-sends of the same row, so consumers can drop duplicates by AMQP message id. */
    String messageId(long rowId) {
        return source + ":" + rowId;
    }

    @Override
    public void store(String routingKey, Object event) {
        try {
            jdbcTemplate.update("INSERT INTO event_outbox (routing_key, event_type, payload) VALUES (?, ?, ?)",
                    routingKey, event.getClass().getName(), objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Event is not serializable: " + event.getClass().getName(), e);
        }
    }

    @Override
    public void flushAsync() {
        try {
            flushExecutor.execute(this::flush);
        } catch (RejectedExecutionException e) {
            log.debug("Outbox relay is shutting down; the scheduled poll will deliver pending events");
        }
    }

    @Scheduled(fixedDelayString = "${app.events.outbox.poll-ms:2000}", initialDelayString = "${app.events.outbox.poll-ms:2000}")
    public void scheduledFlush() {
        flush();
    }

    /** @return number of events delivered */
    public int flush() {
        if (!flushLock.tryLock()) return 0;
        int delivered = 0;
        try {
            while (true) {
                BatchResult result = transactionTemplate.execute(status -> relayBatch());
                if (result == null) break;
                delivered += result.delivered();
                if (result.stopped() || result.claimed() < BATCH_SIZE) break;
            }
        } catch (RuntimeException e) {
            log.warn("Outbox relay failed, will retry: {}", e.getMessage());
        } finally {
            flushLock.unlock();
        }
        return delivered;
    }

    private BatchResult relayBatch() {
        List<OutboxRow> rows = jdbcTemplate.query(
                "SELECT id, routing_key, event_type, payload FROM event_outbox ORDER BY id LIMIT ? FOR UPDATE SKIP LOCKED",
                (rs, i) -> new OutboxRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4)),
                BATCH_SIZE);
        int delivered = 0;
        for (OutboxRow row : rows) {
            Object event;
            try {
                event = deserialize(row);
            } catch (Exception e) {
                log.error("Dropping undeliverable outbox event {} ({}): {}", row.id(), row.eventType(), e.getMessage());
                jdbcTemplate.update("DELETE FROM event_outbox WHERE id = ?", row.id());
                continue;
            }
            try {
                sendConfirmed(row.routingKey(), event, messageId(row.id()));
            } catch (RuntimeException e) {
                log.warn("RabbitMQ unavailable, {} outbox events waiting: {}", rows.size() - delivered, e.getMessage());
                return new BatchResult(rows.size(), delivered, true);
            }
            jdbcTemplate.update("DELETE FROM event_outbox WHERE id = ?", row.id());
            delivered++;
        }
        return new BatchResult(rows.size(), delivered, false);
    }

    private Object deserialize(OutboxRow row) throws ClassNotFoundException, JsonProcessingException {
        if (!row.eventType().startsWith(EVENT_PACKAGE_PREFIX)) {
            throw new IllegalArgumentException("Event type outside the shared contract package");
        }
        return objectMapper.readValue(row.payload(), Class.forName(row.eventType()));
    }

    private void sendConfirmed(String routingKey, Object event, String messageId) {
        rabbitTemplate.invoke(operations -> {
            operations.convertAndSend(EventTopics.EXCHANGE, routingKey, event, message -> {
                message.getMessageProperties().setMessageId(messageId);
                return message;
            });
            operations.waitForConfirmsOrDie(CONFIRM_TIMEOUT_MS);
            return null;
        });
    }

    @PreDestroy
    void shutdown() {
        flushExecutor.shutdown();
    }

    record OutboxRow(long id, String routingKey, String eventType, String payload) {}

    record BatchResult(int claimed, int delivered, boolean stopped) {}
}
