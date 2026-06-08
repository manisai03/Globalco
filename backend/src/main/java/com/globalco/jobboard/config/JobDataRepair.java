package com.globalco.jobboard.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Repairs jobs that reference missing admins after schema migrations or demo data removal.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class JobDataRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("jobs") || !tableExists("admins") || !columnExists("jobs", "admin_id")) {
            return;
        }

        try {
            Integer adminCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM admins", Integer.class);
            if (adminCount == null || adminCount == 0) {
                log.warn("No admins found — jobs with missing admin_id cannot be repaired");
                return;
            }

            int repaired = jdbcTemplate.update("""
                    UPDATE jobs j
                    LEFT JOIN admins a ON j.admin_id = a.id
                    SET j.admin_id = (SELECT MIN(id) FROM admins)
                    WHERE j.admin_id IS NULL OR a.id IS NULL
                    """);

            if (repaired > 0) {
                log.info("Repaired {} job(s) with missing or invalid admin_id", repaired);
            }
        } catch (Exception ex) {
            log.error("Job data repair failed: {}", ex.getMessage(), ex);
        }
    }

    private boolean tableExists(String table) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
                Integer.class, table);
        return count != null && count > 0;
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class, table, column);
        return count != null && count > 0;
    }
}
