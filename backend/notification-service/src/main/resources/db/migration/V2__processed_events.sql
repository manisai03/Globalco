-- Ids of events already handled, so a redelivered RabbitMQ message doesn't create a second notification or email.
-- Written in the same transaction as the notifications; rows older than 14 days are purged.
CREATE TABLE `processed_events` (
  `event_id` varchar(100) NOT NULL,
  `processed_at` datetime(6) NOT NULL,
  PRIMARY KEY (`event_id`),
  KEY `idx_processed_events_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The notification list is ordered by created_at; this lets MySQL read it in order instead of sorting.
CREATE INDEX `idx_notifications_account_created` ON `notifications` (`account_type`, `account_id`, `created_at`);
