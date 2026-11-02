ALTER TABLE saved_searches ADD COLUMN posted_within VARCHAR(20) DEFAULT NULL;

CREATE INDEX idx_saved_searches_user_created ON saved_searches (user_id, created_at);
CREATE INDEX idx_saved_searches_alerts ON saved_searches (alerts_enabled);
CREATE INDEX idx_jobs_featured_status ON jobs (featured, status, created_at);
CREATE INDEX idx_jobs_category_status ON jobs (category, status, created_at);
