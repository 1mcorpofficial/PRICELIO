-- Migration: Gamification core
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS user_points_wallet (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spendable_points integer NOT NULL DEFAULT 0 CHECK (spendable_points >= 0),
  lifetime_xp integer NOT NULL DEFAULT 0 CHECK (lifetime_xp >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  xp_delta integer NOT NULL DEFAULT 0,
  points_delta integer NOT NULL DEFAULT 0,
  reference_type text,
  reference_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_dedupe_idx
  ON points_ledger (user_id, event_type, reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS points_ledger_user_created_idx
  ON points_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rank_levels (
  level integer PRIMARY KEY CHECK (level BETWEEN 1 AND 20),
  rank_name text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  min_xp integer NOT NULL UNIQUE CHECK (min_xp >= 0)
);

INSERT INTO rank_levels (level, rank_name, tier, min_xp) VALUES
  (1, 'Window Shopper', 'bronze', 0),
  (2, 'Receipt Rookie', 'bronze', 100),
  (3, 'Smart Saver', 'bronze', 250),
  (4, 'Deal Finder', 'bronze', 450),
  (5, 'Local Scout', 'bronze', 700),
  (6, 'Price Watcher', 'silver', 1000),
  (7, 'Basket Balancer', 'silver', 1400),
  (8, 'Discount Detective', 'silver', 1900),
  (9, 'Market Mapper', 'silver', 2500),
  (10, 'Bounty Hunter', 'silver', 3200),
  (11, 'Data Dealer', 'gold', 4000),
  (12, 'Inflation Buster', 'gold', 5000),
  (13, 'Catalog Captain', 'gold', 6200),
  (14, 'Price Prophet', 'gold', 7600),
  (15, 'Market Tycoon', 'gold', 9200),
  (16, 'Economy Hacker', 'diamond', 11000),
  (17, 'Oracle of Savings', 'diamond', 13200),
  (18, 'Grand Auditor', 'diamond', 15600),
  (19, 'PRICELIO Titan', 'diamond', 18200),
  (20, 'The Sovereign', 'diamond', 21000)
ON CONFLICT (level) DO UPDATE
SET rank_name = EXCLUDED.rank_name,
    tier = EXCLUDED.tier,
    min_xp = EXCLUDED.min_xp;

CREATE TABLE IF NOT EXISTS user_rank_snapshot (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_level integer NOT NULL REFERENCES rank_levels(level),
  current_rank_name text NOT NULL,
  lifetime_xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_rank_leaderboard_idx
  ON user_rank_snapshot (current_level DESC, lifetime_xp DESC, updated_at ASC);

