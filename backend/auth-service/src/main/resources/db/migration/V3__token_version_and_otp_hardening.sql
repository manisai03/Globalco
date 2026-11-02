ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
ALTER TABLE admins ADD COLUMN token_version INT NOT NULL DEFAULT 0;

-- OTPs are stored as SHA-256 hashes from now on; any plain-text code still pending is invalidated.
UPDATE password_reset_otps SET used = b'1' WHERE used = b'0';
CREATE INDEX idx_password_reset_otps_email ON password_reset_otps (email, used, created_at);
