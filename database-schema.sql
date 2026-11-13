-- WordCircle's server database (PostgreSQL). Idempotent: the API server applies this file on every
-- start, so a fresh database needs no manual step. Flags are SMALLINT 0/1, as the endpoints compare
-- them with numbers. The Telegram, store, game and sync tables are also created on first use by the
-- endpoints that own them.

CREATE TABLE IF NOT EXISTS wordcircle_streak_devices (
  device_id VARCHAR(64) NOT NULL PRIMARY KEY,
  timezone VARCHAR(64) NOT NULL,
  locale VARCHAR(8) NOT NULL DEFAULT 'en',
  day_key CHAR(10) NOT NULL,
  vocab_correct INTEGER NOT NULL DEFAULT 0,
  circle_completed SMALLINT NOT NULL DEFAULT 0,
  definitions_completed SMALLINT NOT NULL DEFAULT 0,
  wordle_completed SMALLINT NOT NULL DEFAULT 0,
  reading_completed SMALLINT NOT NULL DEFAULT 0,
  story_completed SMALLINT NOT NULL DEFAULT 0,
  grammar_correct INTEGER NOT NULL DEFAULT 0,
  listen_completed SMALLINT NOT NULL DEFAULT 0,
  pronunciation_attempts INTEGER NOT NULL DEFAULT 0,
  hangman_completed SMALLINT NOT NULL DEFAULT 0,
  taboo_completed SMALLINT NOT NULL DEFAULT 0,
  alltag_correct INTEGER NOT NULL DEFAULT 0,
  sentence_completed SMALLINT NOT NULL DEFAULT 0,
  -- The ISO week whose WordCircle Pro shield bridged a missed day.
  pro_shield_week CHAR(8) NULL,
  -- Reminders use the interface's own digits (Persian, Arabic-Indic, …) when the learner chose them.
  native_digits SMALLINT NOT NULL DEFAULT 0,
  current_qualified SMALLINT NOT NULL DEFAULT 0,
  last_qualified_day CHAR(10) NULL,
  streak_count INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  vocabulary_goal SMALLINT NOT NULL DEFAULT 8,
  freezes SMALLINT NOT NULL DEFAULT 0,
  qualified_days INTEGER NOT NULL DEFAULT 0,
  reward_collected SMALLINT NOT NULL DEFAULT 0,
  -- NULL until the first collection; read as qualified_days % 7 so old progress carries over.
  embers SMALLINT NULL,
  -- Freezes forged from invite embers on the server (see server/_lib/telegram.ts).
  invite_freezes SMALLINT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_streak_devices_last_qualified_idx ON wordcircle_streak_devices (last_qualified_day);

CREATE TABLE IF NOT EXISTS wordcircle_push_subscriptions (
  endpoint_hash CHAR(64) NOT NULL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key VARCHAR(512) NOT NULL,
  auth_key VARCHAR(512) NOT NULL,
  enabled SMALLINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_push_subscriptions_device_idx ON wordcircle_push_subscriptions (device_id);

-- Telegram: a player's link to @word_circle_bot (streak reminders, sign-in) and their invite code.
CREATE TABLE IF NOT EXISTS wordcircle_telegram_links (
  device_id VARCHAR(64) NOT NULL PRIMARY KEY REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE,
  invite_code VARCHAR(24) NOT NULL UNIQUE,
  link_code VARCHAR(24) NULL UNIQUE,
  chat_id BIGINT NULL,
  telegram_user_id BIGINT NULL,
  reminders SMALLINT NOT NULL DEFAULT 0,
  last_reminded_day CHAR(10) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_telegram_links_user_idx ON wordcircle_telegram_links (telegram_user_id);

-- Every Telegram user counts once as an invited player.
CREATE TABLE IF NOT EXISTS wordcircle_telegram_invites (
  telegram_user_id BIGINT NOT NULL PRIMARY KEY,
  inviter_device_id VARCHAR(64) NOT NULL REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_telegram_invites_inviter_idx ON wordcircle_telegram_invites (inviter_device_id);

CREATE TABLE IF NOT EXISTS wordcircle_reminder_deliveries (
  device_id VARCHAR(64) NOT NULL REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE,
  delivery_date CHAR(10) NOT NULL,
  delivery_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, delivery_date)
);

-- Progress saved to a player's Telegram account: one JSON snapshot of the app's storage per Telegram
-- user, written compare-and-set on `revision`.
CREATE TABLE IF NOT EXISTS wordcircle_progress_snapshots (
  telegram_user_id BIGINT NOT NULL PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  snapshot TEXT NOT NULL,
  updated_by_device VARCHAR(64) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram group games: one session per Play press, valid for a day.
CREATE TABLE IF NOT EXISTS wordcircle_game_sessions (
  id CHAR(32) NOT NULL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  first_name VARCHAR(64) NOT NULL DEFAULT '',
  game VARCHAR(16) NOT NULL,
  chat_id BIGINT NULL,
  message_id BIGINT NULL,
  inline_message_id VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_game_sessions_created_idx ON wordcircle_game_sessions (created_at);

-- Store: paid products and the Pro subscription.
CREATE TABLE IF NOT EXISTS wordcircle_purchases (
  charge_id VARCHAR(255) NOT NULL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  product VARCHAR(32) NOT NULL,
  stars INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wordcircle_purchases_user_idx ON wordcircle_purchases (telegram_user_id);

CREATE TABLE IF NOT EXISTS wordcircle_pro (
  telegram_user_id BIGINT NOT NULL PRIMARY KEY,
  pro_until TIMESTAMPTZ NOT NULL
);
