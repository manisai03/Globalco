ALTER TABLE applications ADD COLUMN reapply_count INT NOT NULL DEFAULT 0;

CREATE INDEX idx_applications_job_status ON applications (job_id, status);
CREATE INDEX idx_interviews_application_status ON interviews (application_id, status);
