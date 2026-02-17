-- Migration: Family households
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_code text NOT NULL DEFAULT 'LT',
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'planner', 'runner', 'junior')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS household_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES household_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_name text,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_events (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email text,
  token text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('planner', 'runner', 'junior')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS household_members_lookup_idx
  ON household_members (household_id, status, role);

CREATE INDEX IF NOT EXISTS household_events_poll_idx
  ON household_events (household_id, id);

CREATE INDEX IF NOT EXISTS household_invites_token_idx
  ON household_invites (token, status, expires_at);

