-- Baseline schema of jobboard_jobs (generated from the live schema when Flyway was introduced).
-- Existing databases are baselined at V1 and skip this script.

CREATE TABLE `jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(255) DEFAULT NULL,
  `company` varchar(255) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `description` text NOT NULL,
  `experience_level` varchar(255) DEFAULT NULL,
  `featured` bit(1) DEFAULT NULL,
  `job_type` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `recruiter_company_description` text,
  `recruiter_company_website` varchar(255) DEFAULT NULL,
  `admin_id` bigint DEFAULT NULL,
  `recruiter_name` varchar(255) DEFAULT NULL,
  `recruiter_title` varchar(255) DEFAULT NULL,
  `salary_max` decimal(38,2) DEFAULT NULL,
  `salary_min` decimal(38,2) DEFAULT NULL,
  `skills` text,
  `status` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_admin` (`admin_id`),
  KEY `idx_jobs_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `saved_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  `job_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKe0hdgkw4tkup6grelv0q8g6qb` (`user_id`,`job_id`),
  KEY `FKawvc9t3d3efu6ta6h30tb984t` (`job_id`),
  CONSTRAINT `FKawvc9t3d3efu6ta6h30tb984t` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `saved_searches` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `alerts_enabled` bit(1) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `experience_level` varchar(255) DEFAULT NULL,
  `job_type` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `min_salary` decimal(38,2) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `search` varchar(255) DEFAULT NULL,
  `sort` varchar(255) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

