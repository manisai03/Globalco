-- Transactional outbox: events are written here in the same transaction as the change that caused them,
-- then relayed to RabbitMQ (JdbcEventOutbox) and deleted once the broker confirms them.
CREATE TABLE event_outbox (
  id BIGINT NOT NULL AUTO_INCREMENT,
  routing_key VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  payload TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
