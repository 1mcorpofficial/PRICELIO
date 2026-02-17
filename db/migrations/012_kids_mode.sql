-- Migration: Kids mode
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS kid_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  age_group text NOT NULL CHECK (age_group IN ('4-8', '9-12')),
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kid_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_profile_id uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS kid_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_profile_id uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('scanner', 'math_quest')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS kid_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_profile_id uuid NOT NULL UNIQUE REFERENCES kid_profiles(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  missions_completed integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kid_profiles_parent_idx
  ON kid_profiles (parent_user_id, is_active);

CREATE INDEX IF NOT EXISTS kid_sessions_parent_idx
  ON kid_sessions (parent_user_id, is_active);

