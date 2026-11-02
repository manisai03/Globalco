package com.globalco.jobboard.notification.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

/**
 * Makes event handling idempotent. Producers stamp every message with a stable AMQP message id (the outbox uses
 * {@code <service>:<outbox row id>}); the id is recorded in the same transaction as the handler's writes, so a
 * redelivery after a crash, or a retry after a partial failure, is either skipped or replayed in full.
 */
@Slf4j
@Component
public class ProcessedEvents {

    static final int RETENTION_DAYS = 14;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public ProcessedEvents(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    /** Runs {@code handler} in a transaction unless an event with this id was already handled. */
    public void runOnce(String eventId, Runnable handler) {
        transactions.executeWithoutResult(status -> {
            if (eventId != null && !eventId.isBlank() && !claim(eventId)) {
                log.info("Skipping already processed event {}", eventId);
                return;
            }
            handler.run();
        });
    }

    private boolean claim(String eventId) {
        // Concurrent deliveries of the same id block on the primary key until the first one commits or rolls back.
        return jdbc.update("INSERT IGNORE INTO processed_events (event_id, processed_at) VALUES (?, ?)",
                eventId, LocalDateTime.now()) == 1;
    }

    @Scheduled(cron = "0 15 3 * * *")
    public void purgeOld() {
        int removed = jdbc.update("DELETE FROM processed_events WHERE processed_at < ?",
                LocalDateTime.now().minusDays(RETENTION_DAYS));
        if (removed > 0) log.info("Purged {} processed event ids", removed);
    }
}
