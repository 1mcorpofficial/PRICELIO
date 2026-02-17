-- Migration: Admin users
-- Date: 2026-02-17
-- Description: DB-backed admin authentication for admin dashboard

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_users_status_idx ON admin_users (status);

COMMENT ON TABLE admin_users IS 'Admin users for operations dashboard authentication';

