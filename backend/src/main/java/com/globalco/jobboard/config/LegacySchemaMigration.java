package com.globalco.jobboard.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * One-time migration from the legacy single users+roles schema to separate users/admins tables.
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class LegacySchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!columnExists("jobs", "created_by")) {
            return;
        }

        log.info("Detected legacy schema — migrating to separate users/admins tables");

        try {
            migrateAdminsFromUsers();
            migrateJobs();
            migrateMessages();
            migrateNotifications();
            cleanupUsersTable();
            jdbcTemplate.execute("DROP TABLE IF EXISTS roles");
            log.info("Legacy schema migration completed");
        } catch (Exception ex) {
            log.error("Legacy schema migration failed: {}", ex.getMessage(), ex);
        }
    }

    private void migrateAdminsFromUsers() {
        if (!tableExists("roles")) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO admins (email, password, full_name, phone, location,
                    company_name, company_website, company_description, recruiter_title,
                    created_at, updated_at)
                SELECT u.email, u.password, u.full_name, u.phone, u.location,
                    u.company_name, u.company_website, u.company_description, u.recruiter_title,
                    u.created_at, u.updated_at
                FROM users u
                INNER JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'ROLE_ADMIN'
                AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.email = u.email)
                """);
    }

    private void migrateJobs() {
        addColumnIfMissing("jobs", "admin_id", "BIGINT");

        jdbcTemplate.update("""
                UPDATE jobs j
                INNER JOIN users u ON j.created_by = u.id
                INNER JOIN admins a ON a.email = u.email
                SET j.admin_id = a.id
                WHERE j.admin_id IS NULL
                """);

        Long defaultAdminId = jdbcTemplate.query(
                "SELECT id FROM admins ORDER BY id LIMIT 1",
                rs -> rs.next() ? rs.getLong("id") : null);

        if (defaultAdminId != null) {
            jdbcTemplate.update("UPDATE jobs SET admin_id = ? WHERE admin_id IS NULL", defaultAdminId);
        }

        dropForeignKeys("jobs", "created_by");
        dropColumnIfExists("jobs", "created_by");
    }

    private void migrateMessages() {
        if (!columnExists("messages", "sender_id") || columnExists("messages", "sender_type")) {
            return;
        }

        addColumnIfMissing("messages", "sender_type", "VARCHAR(10)");
        addColumnIfMissing("messages", "receiver_type", "VARCHAR(10)");

        if (tableExists("roles")) {
            jdbcTemplate.update("""
                    UPDATE messages m
                    INNER JOIN users su ON m.sender_id = su.id
                    INNER JOIN roles sr ON su.role_id = sr.id
                    SET m.sender_type = IF(sr.name = 'ROLE_ADMIN', 'ADMIN', 'USER')
                    WHERE m.sender_type IS NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE messages m
                    INNER JOIN users ru ON m.receiver_id = ru.id
                    INNER JOIN roles rr ON ru.role_id = rr.id
                    SET m.receiver_type = IF(rr.name = 'ROLE_ADMIN', 'ADMIN', 'USER')
                    WHERE m.receiver_type IS NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE messages m
                    INNER JOIN users u ON m.sender_id = u.id
                    INNER JOIN admins a ON a.email = u.email
                    SET m.sender_id = a.id
                    WHERE m.sender_type = 'ADMIN'
                    """);

            jdbcTemplate.update("""
                    UPDATE messages m
                    INNER JOIN users u ON m.receiver_id = u.id
                    INNER JOIN admins a ON a.email = u.email
                    SET m.receiver_id = a.id
                    WHERE m.receiver_type = 'ADMIN'
                    """);
        }

        jdbcTemplate.update("UPDATE messages SET sender_type = 'USER' WHERE sender_type IS NULL");
        jdbcTemplate.update("UPDATE messages SET receiver_type = 'USER' WHERE receiver_type IS NULL");

        dropForeignKeys("messages", "sender_id");
        dropForeignKeys("messages", "receiver_id");
    }

    private void migrateNotifications() {
        if (!columnExists("notifications", "user_id") || columnExists("notifications", "account_type")) {
            return;
        }

        addColumnIfMissing("notifications", "account_type", "VARCHAR(10)");
        addColumnIfMissing("notifications", "account_id", "BIGINT");

        if (tableExists("roles")) {
            jdbcTemplate.update("""
                    UPDATE notifications n
                    INNER JOIN users u ON n.user_id = u.id
                    INNER JOIN roles r ON u.role_id = r.id
                    SET n.account_type = IF(r.name = 'ROLE_ADMIN', 'ADMIN', 'USER'),
                        n.account_id = IF(r.name = 'ROLE_ADMIN',
                            (SELECT a.id FROM admins a WHERE a.email = u.email LIMIT 1),
                            u.id)
                    """);

            jdbcTemplate.update("""
                    UPDATE notifications n
                    INNER JOIN users u ON n.user_id = u.id
                    INNER JOIN admins a ON a.email = u.email
                    SET n.account_id = a.id
                    WHERE n.account_type = 'ADMIN' AND n.account_id IS NULL
                    """);
        }

        jdbcTemplate.update("""
                UPDATE notifications SET account_type = 'USER', account_id = user_id
                WHERE account_type IS NULL AND user_id IS NOT NULL
                """);

        dropForeignKeys("notifications", "user_id");
        dropColumnIfExists("notifications", "user_id");
    }

    private void cleanupUsersTable() {
        if (tableExists("roles")) {
            jdbcTemplate.update("""
                    DELETE u FROM users u
                    INNER JOIN roles r ON u.role_id = r.id
                    WHERE r.name = 'ROLE_ADMIN'
                    """);
        }

        dropForeignKeys("users", "role_id");
        dropColumnIfExists("users", "role_id");
        dropColumnIfExists("users", "company_name");
        dropColumnIfExists("users", "company_website");
        dropColumnIfExists("users", "company_description");
        dropColumnIfExists("users", "recruiter_title");
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

    private void addColumnIfMissing(String table, String column, String definition) {
        if (!columnExists(table, column)) {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        }
    }

    private void dropColumnIfExists(String table, String column) {
        if (columnExists(table, column)) {
            jdbcTemplate.execute("ALTER TABLE " + table + " DROP COLUMN " + column);
        }
    }

    private void dropForeignKeys(String table, String column) {
        List<String> constraints = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? "
                        + "AND REFERENCED_TABLE_NAME IS NOT NULL",
                String.class, table, column);
        for (String constraint : constraints) {
            jdbcTemplate.execute("ALTER TABLE " + table + " DROP FOREIGN KEY " + constraint);
        }
    }
}
