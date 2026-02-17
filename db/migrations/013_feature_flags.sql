-- Migration: Feature flags for phased rollout
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  rollout_percent integer NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  allowed_cities text[],
  metadata jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL REFERENCES feature_flags(flag_key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_key, user_id)
);

INSERT INTO feature_flags (flag_key, enabled, rollout_percent, allowed_cities) VALUES
  ('gamification', true, 100, ARRAY['LT']),
  ('premium_redeem', true, 100, ARRAY['LT']),
  ('family_core', true, 100, ARRAY['LT']),
  ('bounty', true, 100, ARRAY['LT']),
  ('kids_mode', true, 100, ARRAY['LT'])
ON CONFLICT (flag_key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    rollout_percent = EXCLUDED.rollout_percent,
    allowed_cities = EXCLUDED.allowed_cities,
    updated_at = now();

