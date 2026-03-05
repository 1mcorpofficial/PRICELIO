-- =============================================================================
-- PRICELIO Migration 001: All missing tables
-- Generated: 2026-03-05
-- Run manually: psql -U receiptradar -h localhost -d receiptradar -f 001_missing_tables.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FEATURE FLAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key        text PRIMARY KEY,
  enabled         boolean NOT NULL DEFAULT false,
  rollout_percent numeric(5,2) NOT NULL DEFAULT 0,
  allowed_cities  text[] DEFAULT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key   text NOT NULL REFERENCES feature_flags(flag_key) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_key, user_id)
);

-- Seed default flags (all enabled for now; set FEATURE_FLAGS_ENFORCE=true to enforce)
INSERT INTO feature_flags (flag_key, enabled, rollout_percent, description) VALUES
  ('bounty',           true, 100, 'Missions / bounty hunter system'),
  ('kids_mode',        true, 100, 'Kids mode with parent PIN'),
  ('family_plus',      true, 100, 'Family households & shared lists'),
  ('time_machine',     true, 100, 'Price history predictions'),
  ('advanced_analytics', true, 100, 'Advanced spend analytics'),
  ('multi_baskets',    true, 100, 'Multiple shopping baskets'),
  ('priority_scan',    true, 100, 'Priority receipt scanning')
ON CONFLICT (flag_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GAMIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rank_levels (
  level     int PRIMARY KEY,
  rank_name text NOT NULL,
  tier      text NOT NULL CHECK (tier IN ('bronze','silver','gold','diamond')),
  min_xp    int  NOT NULL DEFAULT 0
);

INSERT INTO rank_levels (level, rank_name, tier, min_xp) VALUES
  (1,  'Window Shopper',    'bronze',  0),
  (2,  'Receipt Rookie',    'bronze',  500),
  (3,  'Smart Saver',       'bronze',  1000),
  (4,  'Deal Finder',       'bronze',  1500),
  (5,  'Local Scout',       'bronze',  2000),
  (6,  'Price Watcher',     'silver',  2500),
  (7,  'Basket Balancer',   'silver',  3000),
  (8,  'Discount Detective','silver',  3500),
  (9,  'Market Mapper',     'silver',  4000),
  (10, 'Bounty Hunter',     'silver',  4500),
  (11, 'Data Dealer',       'gold',    5000),
  (12, 'Inflation Buster',  'gold',    5500),
  (13, 'Catalog Captain',   'gold',    6000),
  (14, 'Price Prophet',     'gold',    6500),
  (15, 'Market Tycoon',     'gold',    7000),
  (16, 'Economy Hacker',    'diamond', 7500),
  (17, 'Oracle of Savings', 'diamond', 8000),
  (18, 'Grand Auditor',     'diamond', 8500),
  (19, 'PRICELIO Titan',    'diamond', 9000),
  (20, 'The Sovereign',     'diamond', 9500)
ON CONFLICT (level) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_points_wallet (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spendable_points int NOT NULL DEFAULT 0,
  lifetime_xp      int NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_rank_snapshot (
  user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_level     int  NOT NULL DEFAULT 1,
  current_rank_name text NOT NULL DEFAULT 'Window Shopper',
  lifetime_xp       int  NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  xp_delta       int  NOT NULL DEFAULT 0,
  points_delta   int  NOT NULL DEFAULT 0,
  reference_type text,
  reference_id   text,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_ledger_user_idx ON points_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_ledger_ref_idx  ON points_ledger (user_id, event_type, reference_type, reference_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SUBSCRIPTIONS / PLANS / ENTITLEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  price_eur    numeric(8,2) NOT NULL DEFAULT 0,
  billing_days int  NOT NULL DEFAULT 30,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plans (code, name, price_eur, billing_days, is_active) VALUES
  ('plus_monthly', 'PRICELIO Plus', 2.99, 30, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS plan_features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  UNIQUE (plan_id, feature_key)
);

INSERT INTO plan_features (plan_id, feature_key)
SELECT p.id, f.feature_key
FROM plans p
CROSS JOIN (VALUES
  ('time_machine'),
  ('advanced_analytics'),
  ('multi_baskets'),
  ('priority_scan'),
  ('family_plus')
) AS f(feature_key)
WHERE p.code = 'plus_monthly'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_entitlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key  text NOT NULL,
  source_type  text NOT NULL,  -- 'points_redeem' | 'subscription' | 'manual'
  source_id    uuid,
  starts_at    timestamptz NOT NULL DEFAULT now(),
  ends_at      timestamptz NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_entitlements_user_idx ON user_entitlements (user_id, feature_key, is_active, ends_at);

CREATE TABLE IF NOT EXISTS point_redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_spent int  NOT NULL,
  reward_key   text NOT NULL,
  reward_value jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS point_redemptions_user_idx ON point_redemptions (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FAMILY / HOUSEHOLDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS households (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  city_code     text NOT NULL DEFAULT 'LT',
  currency      text NOT NULL DEFAULT 'EUR',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS households_owner_idx ON households (owner_user_id);

CREATE TABLE IF NOT EXISTS household_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'runner' CHECK (role IN ('owner','planner','runner')),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','removed')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
CREATE INDEX IF NOT EXISTS household_members_user_idx ON household_members (user_id, status);

CREATE TABLE IF NOT EXISTS household_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email        text,
  token        text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  role         text NOT NULL DEFAULT 'runner' CHECK (role IN ('planner','runner')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  expires_at   timestamptz NOT NULL,
  created_by   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS household_invites_token_idx ON household_invites (token);

CREATE TABLE IF NOT EXISTS household_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Shared List',
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS household_lists_hh_idx ON household_lists (household_id);

CREATE TABLE IF NOT EXISTS household_list_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    uuid NOT NULL REFERENCES household_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_name   text,
  quantity   int  NOT NULL DEFAULT 1,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','removed')),
  added_by   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS household_list_items_list_idx ON household_list_items (list_id, status);

CREATE TABLE IF NOT EXISTS household_events (
  id            bigserial PRIMARY KEY,
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS household_events_hh_cursor_idx ON household_events (household_id, id ASC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MISSIONS & CROWDSOURCING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'general',
  reward_points int  NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  store_id      uuid REFERENCES stores(id) ON DELETE SET NULL,
  starts_at     timestamptz NOT NULL DEFAULT now(),
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS missions_status_idx    ON missions (status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS missions_store_idx     ON missions (store_id);

CREATE TABLE IF NOT EXISTS mission_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id       uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  assigned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'started' CHECK (status IN ('started','pending','submitted','completed','cancelled')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mission_tasks_mission_idx ON mission_tasks (mission_id, status);
CREATE INDEX IF NOT EXISTS mission_tasks_user_idx    ON mission_tasks (assigned_user_id, status);

CREATE TABLE IF NOT EXISTS product_identity_claims (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_chain           text NOT NULL,
  product_canonical_name text NOT NULL,
  barcode               text NOT NULL,
  claim_status          text NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending','gold_standard','conflict','rejected')),
  consensus_count       int  NOT NULL DEFAULT 0,
  first_submission_id   uuid,  -- FK added after mission_submissions
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_identity_claims_lookup_idx ON product_identity_claims (store_chain, product_canonical_name, barcode);

CREATE TABLE IF NOT EXISTS mission_submissions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id             uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  task_id                uuid REFERENCES mission_tasks(id) ON DELETE SET NULL,
  claim_id               uuid REFERENCES product_identity_claims(id) ON DELETE SET NULL,
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_chain            text,
  product_canonical_name text,
  barcode                text,
  location_lat           numeric(10,7),
  location_lon           numeric(10,7),
  foreground_app         boolean NOT NULL DEFAULT false,
  media_hash             text,
  trust_score_at_submit  numeric(6,2) NOT NULL DEFAULT 0,
  anti_cheat_flags       jsonb NOT NULL DEFAULT '[]',
  proof_status           text NOT NULL DEFAULT 'pending' CHECK (proof_status IN ('pending','verified','rejected','conflict')),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mission_submissions_mission_idx    ON mission_submissions (mission_id, proof_status);
CREATE INDEX IF NOT EXISTS mission_submissions_user_idx       ON mission_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mission_submissions_claim_idx      ON mission_submissions (claim_id);
CREATE INDEX IF NOT EXISTS mission_submissions_media_hash_idx ON mission_submissions (media_hash) WHERE media_hash IS NOT NULL;

-- Now add the FK from product_identity_claims to mission_submissions
ALTER TABLE product_identity_claims
  ADD COLUMN IF NOT EXISTS first_submission_id uuid REFERENCES mission_submissions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS submission_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES mission_submissions(id) ON DELETE CASCADE,
  media_type    text NOT NULL DEFAULT 'shelfie',
  url           text NOT NULL,
  quality_score numeric(4,3) NOT NULL DEFAULT 0,
  blur_score    numeric(4,3) NOT NULL DEFAULT 0,
  hash          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submission_media_submission_idx ON submission_media (submission_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRUST & MODERATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_trust_score (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trust_value         numeric(8,2) NOT NULL DEFAULT 0,
  positive_events     int NOT NULL DEFAULT 0,
  negative_events     int NOT NULL DEFAULT 0,
  strong_conflicts_30d int NOT NULL DEFAULT 0,
  shadow_banned       boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_moderation_flags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type  text NOT NULL,
  severity   int  NOT NULL DEFAULT 1,
  context    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_moderation_flags_user_idx     ON user_moderation_flags (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_moderation_flags_conflict_idx ON user_moderation_flags (user_id, flag_type, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES mission_submissions(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote          text NOT NULL CHECK (vote IN ('confirm','reject')),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, voter_user_id)
);
CREATE INDEX IF NOT EXISTS verification_votes_claim_idx ON verification_votes (mission_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. GEO ZONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geo_store_zones (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id  uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  lat       numeric(10,7) NOT NULL,
  lon       numeric(10,7) NOT NULL,
  radius_m  int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS geo_store_zones_store_idx ON geo_store_zones (store_id, is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. KIDS MODE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kid_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name   text NOT NULL DEFAULT 'Kid',
  age_group      text NOT NULL DEFAULT '4-8' CHECK (age_group IN ('4-8','9-12')),
  pin_hash       text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kid_profiles_parent_idx ON kid_profiles (parent_user_id, is_active);

CREATE TABLE IF NOT EXISTS kid_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_profile_id uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id   uuid REFERENCES households(id) ON DELETE SET NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  is_active      boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS kid_sessions_profile_idx ON kid_sessions (kid_profile_id, is_active);
CREATE INDEX IF NOT EXISTS kid_sessions_parent_idx  ON kid_sessions (parent_user_id, is_active);

CREATE TABLE IF NOT EXISTS kid_progress (
  kid_profile_id     uuid PRIMARY KEY REFERENCES kid_profiles(id) ON DELETE CASCADE,
  points             int NOT NULL DEFAULT 0,
  missions_completed int NOT NULL DEFAULT 0,
  streak_days        int NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kid_missions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_profile_id uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  mission_id     uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  mode           text NOT NULL DEFAULT 'scanner' CHECK (mode IN ('scanner','math_quest')),
  status         text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','failed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX IF NOT EXISTS kid_missions_profile_idx ON kid_missions (kid_profile_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ALERTS & NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type        text NOT NULL DEFAULT 'PRICE_DROP',
  target_price      numeric(10,2),
  is_active         boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_alerts_user_idx    ON user_alerts (user_id, is_active);
CREATE INDEX IF NOT EXISTS user_alerts_product_idx ON user_alerts (product_id, alert_type, is_active);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  message    text,
  data       jsonb NOT NULL DEFAULT '{}',
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. USER LOYALTY CARDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_loyalty_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_chain text NOT NULL,
  card_label  text,
  card_last4  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_loyalty_cards_user_idx  ON user_loyalty_cards (user_id, is_active);
CREATE INDEX IF NOT EXISTS user_loyalty_cards_chain_idx ON user_loyalty_cards (lower(store_chain));

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. RECEIPT SCAN FEEDBACK
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receipt_scan_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_type text NOT NULL DEFAULT 'incorrect_scan',
  details    text,
  snapshot   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS receipt_scan_feedback_receipt_idx ON receipt_scan_feedback (receipt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS receipt_scan_feedback_user_idx    ON receipt_scan_feedback (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. RECEIPT NUTRITIONAL ANALYSIS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receipt_nutritional_analysis (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id         uuid NOT NULL UNIQUE REFERENCES receipts(id) ON DELETE CASCADE,
  total_calories     int,
  total_protein      numeric(8,2),
  total_carbs        numeric(8,2),
  total_sugar        numeric(8,2),
  total_fat          numeric(8,2),
  total_salt         numeric(8,2),
  total_fiber        numeric(8,2),
  harmful_e_additives jsonb NOT NULL DEFAULT '[]',
  allergen_warnings  jsonb NOT NULL DEFAULT '[]',
  health_score       numeric(4,1),
  analysis_notes     text[],
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. SHELFSNAP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shelf_snaps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url           text NOT NULL,
  extracted_price     numeric(10,2),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shelf_snaps_user_idx ON shelf_snaps (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. PACKAGE SIZE TRAPS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS package_size_traps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  smaller_product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  unit_price_diff_percent numeric(8,2) NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_size_traps_active_idx ON package_size_traps (is_active, unit_price_diff_percent DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. WARRANTY VAULT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warranty_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receipt_id      uuid REFERENCES receipts(id) ON DELETE SET NULL,
  receipt_item_id uuid REFERENCES receipt_items(id) ON DELETE SET NULL,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  purchase_date   date NOT NULL,
  warranty_months int  NOT NULL,
  warranty_expires_at date NOT NULL,
  purchase_price  numeric(10,2),
  store_name      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS warranty_items_user_idx    ON warranty_items (user_id, warranty_expires_at ASC);
CREATE INDEX IF NOT EXISTS warranty_items_expires_idx ON warranty_items (warranty_expires_at ASC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. WAITLIST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waitlist_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_emails_email_idx ON waitlist_emails (lower(email));

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. ADMIN AUDIT LOG  (if not already created by the lazy helper)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id         bigserial PRIMARY KEY,
  actor      text NOT NULL,
  action     text NOT NULL,
  target_id  text,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);

-- =============================================================================
-- Done. All tables are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================================
