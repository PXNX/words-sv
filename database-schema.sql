CREATE TABLE IF NOT EXISTS wordcircle_streak_devices (
  device_id VARCHAR(64) NOT NULL PRIMARY KEY,
  timezone VARCHAR(64) NOT NULL,
  day_key CHAR(10) NOT NULL,
  vocab_correct INT UNSIGNED NOT NULL DEFAULT 0,
  circle_completed TINYINT(1) NOT NULL DEFAULT 0,
  wordle_completed TINYINT(1) NOT NULL DEFAULT 0,
  current_qualified TINYINT(1) NOT NULL DEFAULT 0,
  last_qualified_day CHAR(10) NULL,
  streak_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX wordcircle_streak_devices_last_qualified_idx (last_qualified_day)
);

CREATE TABLE IF NOT EXISTS wordcircle_push_subscriptions (
  endpoint_hash CHAR(64) NOT NULL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key VARCHAR(512) NOT NULL,
  auth_key VARCHAR(512) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX wordcircle_push_subscriptions_device_idx (device_id),
  CONSTRAINT wordcircle_push_subscriptions_device_fk FOREIGN KEY (device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wordcircle_reminder_deliveries (
  device_id VARCHAR(64) NOT NULL,
  delivery_date CHAR(10) NOT NULL,
  delivery_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id, delivery_date, delivery_type),
  CONSTRAINT wordcircle_reminder_deliveries_device_fk FOREIGN KEY (device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
);
