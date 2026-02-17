-- Migration: Trust, moderation and geofencing
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS user_trust_score (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trust_value integer NOT NULL DEFAULT 0,
  positive_events integer NOT NULL DEFAULT 0,
  negative_events integer NOT NULL DEFAULT 0,
  strong_conflicts_30d integer NOT NULL DEFAULT 0,
  shadow_banned boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity integer NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS geo_store_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  lat numeric(9,6) NOT NULL,
  lon numeric(9,6) NOT NULL,
  radius_m integer NOT NULL DEFAULT 200 CHECK (radius_m >= 50),
  city_code text NOT NULL DEFAULT 'LT',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_moderation_flags_user_created_idx
  ON user_moderation_flags (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS geo_store_zones_active_idx
  ON geo_store_zones (is_active, city_code);

