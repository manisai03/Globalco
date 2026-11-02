package com.globalco.jobboard.notification.event;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProcessedEventsTest {

    private JdbcTemplate jdbc;
    private ProcessedEvents processed;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("CREATE TABLE processed_events (event_id VARCHAR(100) PRIMARY KEY, processed_at TIMESTAMP(6) NOT NULL)");
        jdbc.execute("CREATE TABLE notes (id INT AUTO_INCREMENT PRIMARY KEY, text VARCHAR(50))");
        processed = new ProcessedEvents(jdbc, new DataSourceTransactionManager(dataSource));
    }

    private int notes() {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM notes", Integer.class);
        return n == null ? 0 : n;
    }

    @Test
    void redeliveredEventRunsOnlyOnce() {
        AtomicInteger runs = new AtomicInteger();
        Runnable handler = () -> {
            runs.incrementAndGet();
            jdbc.update("INSERT INTO notes (text) VALUES ('hi')");
        };

        processed.runOnce("application-service:42", handler);
        processed.runOnce("application-service:42", handler);

        assertThat(runs).hasValue(1);
        assertThat(notes()).isEqualTo(1);
    }

    @Test
    void failedHandlerLeavesNoTraceSoTheRetryRunsInFull() {
        Runnable failsHalfway = () -> {
            jdbc.update("INSERT INTO notes (text) VALUES ('first of two')");
            throw new IllegalStateException("second insert failed");
        };
        assertThatThrownBy(() -> processed.runOnce("job-service:7", failsHalfway)).isInstanceOf(IllegalStateException.class);
        assertThat(notes()).isZero();

        processed.runOnce("job-service:7", () -> {
            jdbc.update("INSERT INTO notes (text) VALUES ('first of two')");
            jdbc.update("INSERT INTO notes (text) VALUES ('second of two')");
        });
        assertThat(notes()).isEqualTo(2);
    }

    @Test
    void messagesWithoutAnIdAreStillHandled() {
        processed.runOnce(null, () -> jdbc.update("INSERT INTO notes (text) VALUES ('a')"));
        processed.runOnce(null, () -> jdbc.update("INSERT INTO notes (text) VALUES ('b')"));

        assertThat(notes()).isEqualTo(2);
    }
}
