package com.globalco.jobboard.config;

import com.globalco.jobboard.util.RecruiterCompanyUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Clears legacy Globalco placeholder company names from admins and jobs on startup.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class CompanyDataRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("admins")) {
            return;
        }
        try {
            repairAdmins();
            if (tableExists("jobs")) {
                repairJobs();
            }
        } catch (Exception ex) {
            log.error("Company data repair failed: {}", ex.getMessage(), ex);
        }
    }

    private void repairAdmins() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, company_name FROM admins WHERE company_name IS NOT NULL");
        int cleared = 0;
        for (Map<String, Object> row : rows) {
            String name = (String) row.get("company_name");
            if (RecruiterCompanyUtils.isLegacyPlaceholder(name)) {
                jdbcTemplate.update("UPDATE admins SET company_name = NULL WHERE id = ?", row.get("id"));
                cleared++;
            }
        }
        if (cleared > 0) {
            log.info("Cleared legacy placeholder company name from {} admin profile(s)", cleared);
        }
    }

    private void repairJobs() {
        if (!columnExists("jobs", "company")) {
            return;
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT j.id, j.company, j.description, j.admin_id, a.company_name AS admin_company
                FROM jobs j
                LEFT JOIN admins a ON j.admin_id = a.id
                WHERE j.company IS NOT NULL
                """);
        int fixed = 0;
        for (Map<String, Object> row : rows) {
            String company = (String) row.get("company");
            if (!RecruiterCompanyUtils.isLegacyPlaceholder(company)) {
                continue;
            }
            String adminCompany = (String) row.get("admin_company");
            String replacement = RecruiterCompanyUtils.isLegacyPlaceholder(adminCompany) ? null : adminCompany;
            String description = (String) row.get("description");
            if (replacement != null && description != null) {
                description = description
                        .replace("Globalco Technologies", replacement)
                        .replaceAll("(?i)\\bGlobalco\\b", replacement);
            }
            jdbcTemplate.update(
                    "UPDATE jobs SET company = ?, description = ? WHERE id = ?",
                    replacement, description, row.get("id"));
            fixed++;
        }
        if (fixed > 0) {
            log.info("Repaired {} job(s) with legacy Globalco company placeholder", fixed);
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
