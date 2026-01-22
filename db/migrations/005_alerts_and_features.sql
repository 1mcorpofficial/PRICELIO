-- Migration: Alerts, Notifications, and Special Features
-- Date: 2026-01-21
-- Description: Tables for personalized alerts, notifications, shelf snaps, and project baskets

-- User Alerts Table
CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('PRICE_DROP', 'BASKET_READY', 'DEAL_ALERT', 'EXPIRING_SOON')),
  target_price numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_alerts_user_idx ON user_alerts (user_id);
CREATE INDEX IF NOT EXISTS user_alerts_product_idx ON user_alerts (product_id);
CREATE INDEX IF NOT EXISTS user_alerts_active_idx ON user_alerts (is_active, alert_type);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('PRICE_DROP', 'BASKET_READY', 'DEAL_ALERT', 'EXPIRING_SOON', 'SYSTEM')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id, is_read) WHERE is_read = false;

-- ShelfSnap Table (Shelf Label Photo Verification)
CREATE TABLE IF NOT EXISTS shelf_snaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  extracted_price numeric(10,2),
  confidence numeric(4,3),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspicious')),
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  rejection_reason text,
  user_reputation_impact integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shelf_snaps_user_idx ON shelf_snaps (user_id);
CREATE INDEX IF NOT EXISTS shelf_snaps_product_idx ON shelf_snaps (product_id);
CREATE INDEX IF NOT EXISTS shelf_snaps_status_idx ON shelf_snaps (verification_status, created_at DESC);

-- Barcode Scans Table (In-store barcode scanning history)
CREATE TABLE IF NOT EXISTS barcode_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id),
  ean text NOT NULL,
  scanned_price numeric(10,2),
  store_id uuid REFERENCES stores(id),
  location_lat numeric(9,6),
  location_lon numeric(9,6),
  better_option_found boolean DEFAULT false,
  potential_savings numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barcode_scans_user_idx ON barcode_scans (user_id);
CREATE INDEX IF NOT EXISTS barcode_scans_product_idx ON barcode_scans (product_id);
CREATE INDEX IF NOT EXISTS barcode_scans_ean_idx ON barcode_scans (ean);

-- User Reputation/Points System
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reputation_score integer NOT NULL DEFAULT 0,
  total_contributions integer NOT NULL DEFAULT 0,
  verified_contributions integer NOT NULL DEFAULT 0,
  rejected_contributions integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  last_contribution_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Receipt Warranty Vault (Track warranty-relevant items)
CREATE TABLE IF NOT EXISTS warranty_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE,
  receipt_item_id uuid REFERENCES receipt_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  purchase_date date NOT NULL,
  warranty_months integer,
  warranty_expires_at date,
  purchase_price numeric(10,2),
  store_name text,
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS warranty_items_user_idx ON warranty_items (user_id);
CREATE INDEX IF NOT EXISTS warranty_items_expiry_idx ON warranty_items (warranty_expires_at);

-- Project Basket Templates Usage Tracking
CREATE TABLE IF NOT EXISTS project_basket_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  basket_id uuid REFERENCES baskets(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  template_name text NOT NULL,
  total_items integer,
  total_cost numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_basket_usage_user_idx ON project_basket_usage (user_id);
CREATE INDEX IF NOT EXISTS project_basket_usage_template_idx ON project_basket_usage (template_id);

-- Package Size Trap Detector (Flag products where smaller = cheaper per unit)
CREATE TABLE IF NOT EXISTS package_size_traps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  smaller_product_id uuid REFERENCES products(id),
  category_id uuid REFERENCES categories(id),
  larger_price numeric(10,2) NOT NULL,
  larger_unit_price numeric(10,4) NOT NULL,
  smaller_price numeric(10,2) NOT NULL,
  smaller_unit_price numeric(10,4) NOT NULL,
  unit_price_diff_percent numeric(5,2),
  store_id uuid REFERENCES stores(id),
  is_active boolean DEFAULT true,
  detected_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_size_traps_category_idx ON package_size_traps (category_id, is_active);
CREATE INDEX IF NOT EXISTS package_size_traps_store_idx ON package_size_traps (store_id);

-- Add receipt nutritional analysis table (if not exists)
CREATE TABLE IF NOT EXISTS receipt_nutritional_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid UNIQUE REFERENCES receipts(id) ON DELETE CASCADE,
  total_calories numeric(10,2),
  total_protein numeric(10,2),
  total_carbs numeric(10,2),
  total_sugar numeric(10,2),
  total_fat numeric(10,2),
  total_salt numeric(10,2),
  total_fiber numeric(10,2),
  harmful_e_additives text[],
  allergen_warnings text[],
  health_score integer CHECK (health_score BETWEEN 0 AND 100),
  analysis_notes text,
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_nutrition_receipt_idx ON receipt_nutritional_analysis (receipt_id);

-- Comments
COMMENT ON TABLE user_alerts IS 'Personalized price and deal alerts';
COMMENT ON TABLE notifications IS 'User notifications for alerts and system messages';
COMMENT ON TABLE shelf_snaps IS 'User-submitted shelf label photos for price verification';
COMMENT ON TABLE barcode_scans IS 'In-store barcode scanning history';
COMMENT ON TABLE user_reputation IS 'User reputation and contribution tracking';
COMMENT ON TABLE warranty_items IS 'Receipt warranty vault for tracking warranties';
COMMENT ON TABLE package_size_traps IS 'Detection of products where bigger packages cost more per unit';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SPECIAL FEATURES MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added tables:';
  RAISE NOTICE '  - user_alerts (personalized alerts)';
  RAISE NOTICE '  - notifications (alert delivery)';
  RAISE NOTICE '  - shelf_snaps (shelf label verification)';
  RAISE NOTICE '  - barcode_scans (in-store scanning)';
  RAISE NOTICE '  - user_reputation (gamification)';
  RAISE NOTICE '  - warranty_items (receipt vault)';
  RAISE NOTICE '  - package_size_traps (trap detection)';
  RAISE NOTICE '  - receipt_nutritional_analysis';
  RAISE NOTICE '========================================';
END $$;
