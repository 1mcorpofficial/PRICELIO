-- Migration: Web V2 demo sessions + UI funnel events
-- Date: 2026-02-23

CREATE TABLE IF NOT EXISTS demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  reward_xp integer NOT NULL DEFAULT 50 CHECK (reward_xp >= 0),
  reward_points integer NOT NULL DEFAULT 50 CHECK (reward_points >= 0),
  expires_at timestamptz NOT NULL,
  claimed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  session_id text,
  user_agent text,
  ip_hash text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_sessions_expiry_idx
  ON demo_sessions (expires_at DESC);

CREATE INDEX IF NOT EXISTS demo_sessions_claimed_idx
  ON demo_sessions (claimed_by_user_id, claimed_at DESC);

CREATE TABLE IF NOT EXISTS ui_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ui_events_log_event_created_idx
  ON ui_events_log (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ui_events_log_user_created_idx
  ON ui_events_log (user_id, created_at DESC);
