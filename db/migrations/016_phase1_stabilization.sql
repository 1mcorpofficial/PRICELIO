-- Phase 1 stabilization: auth refresh rotation, admin audit, and query indexing

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  jti text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_jti text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_refresh_tokens_user_active_idx
  ON auth_refresh_tokens (user_id, revoked_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS auth_refresh_tokens_expires_idx
  ON auth_refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  target_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS offers_compare_idx
  ON offers (product_id, status, valid_to, price_value);

CREATE INDEX IF NOT EXISTS stores_chain_city_active_idx
  ON stores (chain, city_id, is_active);
