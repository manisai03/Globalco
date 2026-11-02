-- Baseline schema of jobboard_applications (generated from the live schema when Flyway was introduced).
-- Existing databases are baselined at V1 and skip this script.

CREATE TABLE `applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company` varchar(255) DEFAULT NULL,
  `cover_letter` text,
  `created_at` datetime(6) DEFAULT NULL,
  `job_id` bigint NOT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `match_score` int DEFAULT NULL,
  `recruiter_id` bigint DEFAULT NULL,
  `recruiter_viewed` bit(1) DEFAULT NULL,
  `resume_url` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKi3q7htrq10m6sedv6qhimbafh` (`job_id`,`user_id`),
  KEY `idx_applications_recruiter_created` (`recruiter_id`,`created_at`),
  KEY `idx_applications_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `interviews` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `notes` text,
  `scheduled_at` datetime(6) NOT NULL,
  `status` varchar(255) NOT NULL,
  `application_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKok2bail5ls3jjbjgl5c6nt620` (`application_id`),
  CONSTRAINT `FKok2bail5ls3jjbjgl5c6nt620` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

