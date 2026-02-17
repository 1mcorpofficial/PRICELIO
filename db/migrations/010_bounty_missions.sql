-- Migration: Bounty missions and proof submissions
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  reward_points integer NOT NULL DEFAULT 20 CHECK (reward_points >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'submitted', 'verified', 'rejected')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_identity_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_chain text NOT NULL,
  product_canonical_name text NOT NULL,
  barcode text NOT NULL,
  claim_status text NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'gold_standard', 'conflict', 'rejected')),
  consensus_count integer NOT NULL DEFAULT 0,
  first_submission_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_chain, product_canonical_name, barcode)
);

CREATE TABLE IF NOT EXISTS mission_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  task_id uuid REFERENCES mission_tasks(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES product_identity_claims(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_chain text NOT NULL,
  product_canonical_name text NOT NULL,
  barcode text NOT NULL,
  location_lat numeric(9,6),
  location_lon numeric(9,6),
  foreground_app boolean NOT NULL DEFAULT false,
  media_hash text,
  trust_score_at_submit integer NOT NULL DEFAULT 0,
  anti_cheat_flags jsonb,
  proof_status text NOT NULL DEFAULT 'pending' CHECK (proof_status IN ('pending', 'verified', 'rejected', 'conflict')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES mission_submissions(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('shelfie', 'face', 'back', 'price_tag', 'barcode')),
  url text NOT NULL,
  quality_score numeric(4,3),
  blur_score numeric(4,3),
  hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES mission_submissions(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('confirm', 'reject')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS missions_status_idx
  ON missions (status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS mission_tasks_user_status_idx
  ON mission_tasks (assigned_user_id, status);

CREATE INDEX IF NOT EXISTS mission_submissions_user_created_idx
  ON mission_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mission_submissions_claim_status_idx
  ON mission_submissions (claim_id, proof_status, created_at DESC);

CREATE INDEX IF NOT EXISTS verification_votes_claim_window_idx
  ON verification_votes (submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS submission_media_hash_idx
  ON submission_media (hash);

