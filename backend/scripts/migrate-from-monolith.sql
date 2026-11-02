-- One-time copy of the monolith database (`jobboard`) into the per-service databases.
--
-- Run it AFTER every service has started once against the target MySQL (Hibernate creates the tables),
-- and BEFORE users start writing to the new stack:
--   mysql -h <host> -P <port> -u root -p < backend/scripts/migrate-from-monolith.sql
--
-- Primary keys are preserved, so every cross-service id (user_id, admin_id, job_id ...) stays valid.
-- INSERT IGNORE makes the script safe to re-run: rows that were already copied are skipped.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------- auth-service
INSERT IGNORE INTO jobboard_auth.users
    (id, email, password, full_name, phone, location, bio, skills, headline, current_title, open_to_work,
     education_profile, employment_profile, internships_profile,
     profile_picture_url, profile_picture_public_id, profile_picture_uploaded_at,
     resume_url, resume_uploaded_at, created_at, updated_at)
SELECT id, email, password, full_name, phone, location, bio, skills, headline, current_title, open_to_work,
       education_profile, employment_profile, internships_profile,
       profile_picture_url, profile_picture_public_id, profile_picture_uploaded_at,
       resume_url, resume_uploaded_at, created_at, updated_at
FROM jobboard.users;

INSERT IGNORE INTO jobboard_auth.admins
    (id, email, password, full_name, phone, location, company_name, company_website, company_description,
     recruiter_title, created_at, updated_at)
SELECT id, email, password, full_name, phone, location, company_name, company_website, company_description,
       recruiter_title, created_at, updated_at
FROM jobboard.admins;

INSERT IGNORE INTO jobboard_auth.password_reset_otps (id, email, otp, expires_at, used, failed_attempts, created_at)
SELECT id, email, otp, expires_at, used, failed_attempts, created_at
FROM jobboard.password_reset_otps
WHERE expires_at > NOW() AND used = FALSE;

-- ---------------------------------------------------------------- job-service
-- Jobs carry a copy of the recruiter details shown on postings (kept fresh by account.recruiter-updated).
INSERT IGNORE INTO jobboard_jobs.jobs
    (id, title, company, description, location, salary_min, salary_max, experience_level, job_type, category,
     skills, status, featured, admin_id,
     recruiter_name, recruiter_company_description, recruiter_company_website, recruiter_title,
     created_at, updated_at)
SELECT j.id, j.title, j.company, j.description, j.location, j.salary_min, j.salary_max, j.experience_level,
       j.job_type, j.category, j.skills, j.status, j.featured, j.admin_id,
       a.full_name, a.company_description, a.company_website, a.recruiter_title,
       j.created_at, j.updated_at
FROM jobboard.jobs j
LEFT JOIN jobboard.admins a ON a.id = j.admin_id;

INSERT IGNORE INTO jobboard_jobs.saved_jobs (id, user_id, job_id, created_at)
SELECT id, user_id, job_id, created_at FROM jobboard.saved_jobs;

INSERT IGNORE INTO jobboard_jobs.saved_searches
    (id, user_id, name, search, location, job_type, experience_level, category, min_salary, sort,
     alerts_enabled, created_at)
SELECT id, user_id, name, search, location, job_type, experience_level, category, min_salary, sort,
       alerts_enabled, created_at
FROM jobboard.saved_searches;

-- ---------------------------------------------------------------- application-service
-- Applications carry the job owner and job title/company so recruiter dashboards need no cross-service join.
INSERT IGNORE INTO jobboard_applications.applications
    (id, job_id, user_id, recruiter_id, job_title, company, resume_url, cover_letter, status, match_score,
     recruiter_viewed, created_at, updated_at)
SELECT ap.id, ap.job_id, ap.user_id, j.admin_id, j.title, j.company, ap.resume_url, ap.cover_letter, ap.status,
       ap.match_score, ap.recruiter_viewed, ap.created_at, ap.updated_at
FROM jobboard.applications ap
JOIN jobboard.jobs j ON j.id = ap.job_id;

INSERT IGNORE INTO jobboard_applications.interviews (id, application_id, scheduled_at, location, notes, status, created_at)
SELECT id, application_id, scheduled_at, location, notes, status, created_at FROM jobboard.interviews;

-- ---------------------------------------------------------------- messaging-service
INSERT IGNORE INTO jobboard_messaging.messages
    (id, sender_type, sender_id, receiver_type, receiver_id, content, read_flag, created_at)
SELECT id, sender_type, sender_id, receiver_type, receiver_id, content, read_flag, created_at
FROM jobboard.messages;

-- ---------------------------------------------------------------- notification-service
INSERT IGNORE INTO jobboard_notifications.notifications
    (id, account_type, account_id, title, message, type, read_flag, reference_id, created_at)
SELECT id, account_type, account_id, title, message, type, read_flag, reference_id, created_at
FROM jobboard.notifications;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- New ids continue after the copied ones (InnoDB derives AUTO_INCREMENT from MAX(id) on insert),
-- so nothing else is needed. Quick sanity check:
SELECT 'users' AS entity, (SELECT COUNT(*) FROM jobboard.users) AS monolith, (SELECT COUNT(*) FROM jobboard_auth.users) AS service
UNION ALL SELECT 'admins', (SELECT COUNT(*) FROM jobboard.admins), (SELECT COUNT(*) FROM jobboard_auth.admins)
UNION ALL SELECT 'jobs', (SELECT COUNT(*) FROM jobboard.jobs), (SELECT COUNT(*) FROM jobboard_jobs.jobs)
UNION ALL SELECT 'applications', (SELECT COUNT(*) FROM jobboard.applications), (SELECT COUNT(*) FROM jobboard_applications.applications)
UNION ALL SELECT 'messages', (SELECT COUNT(*) FROM jobboard.messages), (SELECT COUNT(*) FROM jobboard_messaging.messages)
UNION ALL SELECT 'notifications', (SELECT COUNT(*) FROM jobboard.notifications), (SELECT COUNT(*) FROM jobboard_notifications.notifications);
