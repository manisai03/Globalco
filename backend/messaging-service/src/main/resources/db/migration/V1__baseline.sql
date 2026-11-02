-- Baseline schema of jobboard_messaging (generated from the live schema when Flyway was introduced).
-- Existing databases are baselined at V1 and skip this script.

CREATE TABLE `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `read_flag` bit(1) DEFAULT NULL,
  `receiver_id` bigint NOT NULL,
  `receiver_type` enum('ADMIN','USER') NOT NULL,
  `sender_id` bigint NOT NULL,
  `sender_type` enum('ADMIN','USER') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_messages_receiver` (`receiver_type`,`receiver_id`,`read_flag`),
  KEY `idx_messages_sender` (`sender_type`,`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

