-- Database-per-service: each service owns exactly one schema and never reads another's tables.
CREATE DATABASE IF NOT EXISTS jobboard_auth;
CREATE DATABASE IF NOT EXISTS jobboard_jobs;
CREATE DATABASE IF NOT EXISTS jobboard_applications;
CREATE DATABASE IF NOT EXISTS jobboard_messaging;
CREATE DATABASE IF NOT EXISTS jobboard_notifications;
