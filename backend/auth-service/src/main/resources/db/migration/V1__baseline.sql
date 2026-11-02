-- Baseline schema of jobboard_auth (generated from the live schema when Flyway was introduced).
-- Existing databases are baselined at V1 and skip this script.

CREATE TABLE `admins` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_description` text,
  `company_name` varchar(255) DEFAULT NULL,
  `company_website` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `recruiter_title` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK47bvqemyk6vlm0w7crc3opdd4` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `password_reset_otps` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `failed_attempts` int NOT NULL DEFAULT '0',
  `otp` varchar(255) NOT NULL,
  `used` bit(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bio` text,
  `created_at` datetime(6) DEFAULT NULL,
  `current_title` varchar(255) DEFAULT NULL,
  `education_profile` text,
  `email` varchar(255) NOT NULL,
  `employment_profile` text,
  `full_name` varchar(255) NOT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `internships_profile` text,
  `location` varchar(255) DEFAULT NULL,
  `open_to_work` bit(1) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `profile_picture_public_id` varchar(255) DEFAULT NULL,
  `profile_picture_uploaded_at` datetime(6) DEFAULT NULL,
  `profile_picture_url` varchar(255) DEFAULT NULL,
  `resume_uploaded_at` datetime(6) DEFAULT NULL,
  `resume_url` varchar(255) DEFAULT NULL,
  `skills` text,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

