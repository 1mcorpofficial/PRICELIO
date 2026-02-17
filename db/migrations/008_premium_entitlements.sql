-- Migration: Premium plans and entitlements
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_eur numeric(10,2) NOT NULL CHECK (price_eur >= 0),
  billing_days integer NOT NULL DEFAULT 30 CHECK (billing_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_spent integer NOT NULL CHECK (points_spent > 0),
  reward_key text NOT NULL,
  reward_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('subscription', 'points_redeem', 'promo')),
  source_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_entitlements_user_feature_idx
  ON user_entitlements (user_id, feature_key, ends_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS point_redemptions_user_created_idx
  ON point_redemptions (user_id, created_at DESC);

INSERT INTO plans (code, name, price_eur, billing_days, is_active)
VALUES ('plus_monthly', 'PRICELIO Plus Monthly', 2.99, 30, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    price_eur = EXCLUDED.price_eur,
    billing_days = EXCLUDED.billing_days,
    is_active = EXCLUDED.is_active;

INSERT INTO plan_features (plan_id, feature_key)
SELECT p.id, f.feature_key
FROM plans p
CROSS JOIN (
  VALUES
    ('time_machine'),
    ('advanced_analytics'),
    ('multi_baskets'),
    ('priority_scan'),
    ('family_plus')
) AS f(feature_key)
WHERE p.code = 'plus_monthly'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

