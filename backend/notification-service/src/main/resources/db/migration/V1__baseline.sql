-- Baseline schema of jobboard_notifications (generated from the live schema when Flyway was introduced).
-- Existing databases are baselined at V1 and skip this script.

CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL,
  `account_type` enum('ADMIN','USER') NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `message` text NOT NULL,
  `read_flag` bit(1) DEFAULT NULL,
  `reference_id` bigint DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_account` (`account_type`,`account_id`,`read_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

