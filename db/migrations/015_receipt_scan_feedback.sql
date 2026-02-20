CREATE TABLE IF NOT EXISTS receipt_scan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_type text NOT NULL DEFAULT 'incorrect_scan',
  details text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_scan_feedback_receipt_idx
  ON receipt_scan_feedback (receipt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS receipt_scan_feedback_user_idx
  ON receipt_scan_feedback (user_id, created_at DESC);
