-- Initial schema for ReceiptRadar (MVP core)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'LT',
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cities_name_country_idx ON cities (name, country_code);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  password_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

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

CREATE TABLE IF NOT EXISTS guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash text,
  ip_hash text,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  spec_schema jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text NOT NULL,
  name text,
  city_id uuid REFERENCES cities(id),
  format text,
  address text,
  lat numeric(9,6),
  lon numeric(9,6),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_city_idx ON stores (city_id);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  variant text,
  category_id uuid REFERENCES categories(id),
  pack_size_value numeric(10,3),
  pack_size_unit text,
  unit_price_basis text,
  ean text,
  attributes jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_name_idx ON products (name);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_ean_idx ON products (ean) WHERE ean IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name text NOT NULL,
  normalized_name text,
  product_id uuid REFERENCES products(id),
  source_type text NOT NULL CHECK (source_type IN ('flyer', 'online', 'receipt', 'manual')),
  confidence numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_aliases_product_idx ON product_aliases (product_id);
CREATE INDEX IF NOT EXISTS product_aliases_norm_idx ON product_aliases (normalized_name);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  source_type text NOT NULL CHECK (source_type IN ('flyer', 'online')),
  store_id uuid REFERENCES stores(id),
  store_chain text,
  city_id uuid REFERENCES cities(id),
  price_value numeric(10,2) NOT NULL,
  old_price_value numeric(10,2),
  discount_percent numeric(5,2),
  currency text NOT NULL DEFAULT 'EUR',
  unit_price_value numeric(10,4),
  unit_price_unit text,
  valid_from date,
  valid_to date,
  conditions jsonb,
  source_pointer jsonb,
  source_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'disputed', 'hidden')),
  proof_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offers_product_idx ON offers (product_id);
CREATE INDEX IF NOT EXISTS offers_city_idx ON offers (city_id);
CREATE INDEX IF NOT EXISTS offers_valid_to_idx ON offers (valid_to);
CREATE INDEX IF NOT EXISTS offers_status_idx ON offers (status);

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  guest_session_id uuid REFERENCES guest_sessions(id),
  store_id uuid REFERENCES stores(id),
  store_chain text,
  store_raw text,
  receipt_date timestamptz,
  subtotal numeric(10,2),
  tax_total numeric(10,2),
  total numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'uploaded' CHECK (
    status IN ('uploaded', 'processing', 'processed', 'needs_confirmation', 'finalized')
  ),
  confidence numeric(4,3),
  image_object_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipts_owner_check CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS receipts_user_idx ON receipts (user_id);
CREATE INDEX IF NOT EXISTS receipts_guest_idx ON receipts (guest_session_id);
CREATE INDEX IF NOT EXISTS receipts_store_idx ON receipts (store_id);

CREATE TABLE IF NOT EXISTS receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  line_number integer,
  raw_name text NOT NULL,
  normalized_name text,
  quantity numeric(10,3),
  unit_price numeric(10,2),
  total_price numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  matched_product_id uuid REFERENCES products(id),
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (
    match_status IN ('matched', 'candidates', 'unmatched')
  ),
  confidence numeric(4,3),
  candidates jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_items_receipt_idx ON receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS receipt_items_product_idx ON receipt_items (matched_product_id);

CREATE TABLE IF NOT EXISTS price_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  city_id uuid REFERENCES cities(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  median_price numeric(10,2),
  min_price numeric(10,2),
  max_price numeric(10,2),
  sample_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'receipt',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, city_id, period_start, period_end, source)
);

CREATE INDEX IF NOT EXISTS price_stats_product_idx ON price_stats (product_id);
CREATE INDEX IF NOT EXISTS price_stats_city_idx ON price_stats (city_id);

CREATE TABLE IF NOT EXISTS baskets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  guest_session_id uuid REFERENCES guest_sessions(id),
  name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT baskets_owner_check CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS baskets_user_idx ON baskets (user_id);
CREATE INDEX IF NOT EXISTS baskets_guest_idx ON baskets (guest_session_id);

CREATE TABLE IF NOT EXISTS basket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id uuid NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  raw_name text,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS basket_items_basket_idx ON basket_items (basket_id);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  event_name text NOT NULL,
  city_id uuid REFERENCES cities(id),
  count integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_date, event_name, COALESCE(city_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX IF NOT EXISTS events_name_idx ON events (event_name);
CREATE INDEX IF NOT EXISTS events_date_idx ON events (event_date);

-- Add nutritional information to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutritional_data JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS e_additives TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT[];

COMMENT ON COLUMN products.nutritional_data IS 'Nutritional values per 100g: calories, protein, carbs, sugar, fat, salt, fiber';
COMMENT ON COLUMN products.ingredients IS 'Full ingredient list';
COMMENT ON COLUMN products.e_additives IS 'Array of E-codes found in product';
COMMENT ON COLUMN products.allergens IS 'Array of allergen warnings';

-- Create nutritional analysis results table
CREATE TABLE IF NOT EXISTS receipt_nutritional_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  total_calories DECIMAL(10, 2),
  total_protein DECIMAL(10, 2),
  total_carbs DECIMAL(10, 2),
  total_sugar DECIMAL(10, 2),
  total_fat DECIMAL(10, 2),
  total_salt DECIMAL(10, 2),
  total_fiber DECIMAL(10, 2),
  harmful_e_additives JSONB, -- {e_code, name, danger_level, found_in: [product_ids]}
  allergen_warnings TEXT[],
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  analysis_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_nutrition_receipt ON receipt_nutritional_analysis(receipt_id);

-- Add sample nutritional data for existing products (example)
UPDATE products 
SET 
  nutritional_data = jsonb_build_object(
    'calories', 250,
    'protein', 8,
    'carbs', 45,
    'sugar', 2,
    'fat', 3,
    'salt', 1.2,
    'fiber', 5
  ),
  ingredients = 'Ruginiai miltai, vanduo, ragas, druska',
  e_additives = ARRAY[]::TEXT[],
  allergens = ARRAY['gluten']::TEXT[]
WHERE name LIKE '%duona%' OR name LIKE '%bread%';

UPDATE products 
SET 
  nutritional_data = jsonb_build_object(
    'calories', 64,
    'protein', 3.2,
    'carbs', 4.8,
    'sugar', 4.8,
    'fat', 3.6,
    'salt', 0.1,
    'fiber', 0
  ),
  ingredients = 'Pienas, pieno bakterijos',
  e_additives = ARRAY[]::TEXT[],
  allergens = ARRAY['milk', 'lactose']::TEXT[]
WHERE name LIKE '%pienas%' OR name LIKE '%milk%';

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
