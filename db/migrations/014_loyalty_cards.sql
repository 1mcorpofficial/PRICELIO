-- User loyalty cards for personalized store recommendations
CREATE TABLE IF NOT EXISTS user_loyalty_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_chain text NOT NULL,
  card_label text,
  card_last4 text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_loyalty_cards_user_idx
  ON user_loyalty_cards (user_id, is_active);

CREATE INDEX IF NOT EXISTS user_loyalty_cards_chain_idx
  ON user_loyalty_cards (lower(store_chain));
