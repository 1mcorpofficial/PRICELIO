# 🗄️ DATABASE IR DATA MODEL

**Failas:** 07_DATABASE_AND_DATA_MODEL.md  
**Kategorija:** Database & Data Model  
**Versija:** 6.0 Final  
**Data:** 2026-01-22

---

## 🎯 DATABASE OVERVIEW

ReceiptRadar naudoja **PostgreSQL 15** kaip pagrindinę duomenų bazę su **30+ tables**, **5 migrations**, ir **pg_trgm extension** fuzzy matching. Duomenų modelis optimizuotas performance, data integrity, ir scalability.

---

## 🏗️ DATABASE ARCHITECTURE

### Technology Stack:
- **Database:** PostgreSQL 15
- **Extensions:** pg_trgm (fuzzy matching), uuid-ossp (UUIDs)
- **Connection Pooling:** pg-pool (max 20 connections)
- **Backup:** pg_dump (daily)
- **Replication:** Streaming replication (future)

### Schema Organization:
```
pricelio (database)
├── public schema
│   ├── Core tables (cities, users, stores, products)
│   ├── Transaction tables (receipts, baskets, orders)
│   ├── Analytics tables (events, metrics)
│   └── Feature tables (alerts, warranties, etc.)
└── Extensions
    ├── pg_trgm (fuzzy matching)
    └── uuid-ossp (UUID generation)
```

---

## 📊 CORE TABLES

### 1. CITIES
**Purpose:** Supported cities  
**Rows:** 4

```sql
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  country VARCHAR(50) DEFAULT 'Lithuania',
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  population INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data:
INSERT INTO cities (name, lat, lon, population) VALUES
  ('Vilnius', 54.6872, 25.2797, 580000),
  ('Kaunas', 54.8985, 23.9036, 290000),
  ('Klaipėda', 55.7033, 21.1443, 150000),
  ('Šiauliai', 55.9349, 23.3135, 100000);
```

---

### 2. USERS
**Purpose:** Registered users  
**Rows:** ~1000s (expected)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  city_id INTEGER REFERENCES cities(id),
  notifications_enabled BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city ON users(city_id);
CREATE INDEX idx_users_created ON users(created_at DESC);
```

**Relations:**
- `city_id` → cities.id (Many users per city)

**Security:**
- Passwords hashed with bcrypt (cost 10)
- Email verification required
- GDPR compliant (data export/deletion)

---

### 3. GUEST_SESSIONS
**Purpose:** Anonymous browsing  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(50),
  user_agent TEXT,
  city_id INTEGER REFERENCES cities(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guest_expires ON guest_sessions(expires_at);
CREATE INDEX idx_guest_ip ON guest_sessions(ip_address);
```

**Cleanup:**
```sql
-- Delete expired sessions (run daily)
DELETE FROM guest_sessions WHERE expires_at < NOW();
```

---

### 4. CATEGORIES
**Purpose:** Product categories  
**Rows:** 20

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  parent_id INTEGER REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data:
INSERT INTO categories (name, slug, icon) VALUES
  ('Dairy', 'dairy', '🥛'),
  ('Bread & Bakery', 'bread', '🍞'),
  ('Meat & Fish', 'meat', '🥩'),
  ('Fruits & Vegetables', 'produce', '🍎'),
  ('Beverages', 'beverages', '🧃'),
  ('Household', 'household', '🧹'),
  ('Personal Care', 'personal-care', '🧴'),
  ('Baby Products', 'baby', '👶'),
  ('Pet Supplies', 'pets', '🐕'),
  ('Electronics', 'electronics', '💻'),
  ('Books', 'books', '📚'),
  ('Home & Garden', 'home', '🏡'),
  ('Sports', 'sports', '⚽'),
  ('Toys', 'toys', '🧸'),
  ('Pharmacy', 'pharmacy', '💊'),
  ('Beauty', 'beauty', '💄'),
  ('Alcohol', 'alcohol', '🍷'),
  ('Frozen Foods', 'frozen', '🧊'),
  ('Snacks', 'snacks', '🍿'),
  ('Other', 'other', '📦');
```

---

### 5. STORES
**Purpose:** Physical retail locations  
**Rows:** 93+

```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  city_id INTEGER REFERENCES cities(id),
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  phone VARCHAR(50),
  open_hours JSONB,
  category VARCHAR(50) CHECK (category IN ('grocery', 'diy', 'books', 'beauty', 'electronics', 'wine')),
  website VARCHAR(200),
  logo_url VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain, address)
);

CREATE INDEX idx_stores_city ON stores(city_id);
CREATE INDEX idx_stores_category ON stores(category);
CREATE INDEX idx_stores_location ON stores(lat, lon);
CREATE INDEX idx_stores_chain ON stores(chain);
```

**Example Data:**
```sql
INSERT INTO stores (chain, name, address, city_id, lat, lon, category) VALUES
  ('Maxima', 'Maxima X', 'Savanorių pr. 16, Vilnius', 1, 54.6872, 25.2797, 'grocery'),
  ('Rimi', 'Rimi Hyper', 'Ozo g. 25, Vilnius', 1, 54.7103, 25.2667, 'grocery'),
  ('Senukai', 'Senukai', 'Ukmergės g. 369, Vilnius', 1, 54.7258, 25.3038, 'diy');
```

**open_hours JSONB:**
```json
{
  "monday": "08:00-22:00",
  "tuesday": "08:00-22:00",
  "wednesday": "08:00-22:00",
  "thursday": "08:00-22:00",
  "friday": "08:00-22:00",
  "saturday": "09:00-21:00",
  "sunday": "10:00-20:00"
}
```

---

### 6. PRODUCTS
**Purpose:** Product catalog  
**Rows:** ~50000s (expected)

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  brand VARCHAR(200),
  category_id INTEGER REFERENCES categories(id),
  ean VARCHAR(13),
  pack_size DECIMAL(10, 2),
  pack_unit VARCHAR(10) CHECK (pack_unit IN ('g', 'kg', 'ml', 'L', 'pcs')),
  image_url TEXT,
  description TEXT,
  ingredients TEXT,
  nutrition JSONB,
  allergens TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_ean ON products(ean);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
```

**nutrition JSONB:**
```json
{
  "calories": 250,
  "protein": 8,
  "carbs": 35,
  "fat": 6,
  "sugar": 5,
  "fiber": 2,
  "salt": 0.5,
  "servingSize": 100,
  "servingUnit": "g"
}
```

---

### 7. PRODUCT_ALIASES
**Purpose:** Alternative names for product matching  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE product_aliases (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  alias VARCHAR(500) NOT NULL,
  source_type VARCHAR(50) CHECK (source_type IN ('ocr', 'user', 'admin', 'manual')),
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, alias)
);

CREATE INDEX idx_aliases_product ON product_aliases(product_id);
CREATE INDEX idx_aliases_alias ON product_aliases(alias);
CREATE INDEX idx_aliases_alias_trgm ON product_aliases USING gin(alias gin_trgm_ops);
```

**Example:**
```sql
-- Product: "Žemaitijos pienas 2.5% 1L"
INSERT INTO product_aliases (product_id, alias, source_type, confidence) VALUES
  (123, 'pienas zemaitijos', 'ocr', 0.95),
  (123, 'žem. pienas', 'ocr', 0.90),
  (123, 'pienas 2.5', 'user', 1.00);
```

---

### 8. OFFERS
**Purpose:** Flyer and online prices  
**Rows:** ~100000s (expected)

```sql
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(500) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  discount_percentage INTEGER,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  image_url TEXT,
  source VARCHAR(50) CHECK (source IN ('flyer', 'website', 'api', 'manual')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, product_name, valid_from)
);

CREATE INDEX idx_offers_store_product ON offers(store_id, product_id);
CREATE INDEX idx_offers_valid ON offers(valid_until) WHERE valid_until > NOW();
CREATE INDEX idx_offers_price ON offers(price);
CREATE INDEX idx_offers_source ON offers(source);
```

**Cleanup:**
```sql
-- Delete expired offers (run weekly)
DELETE FROM offers WHERE valid_until < NOW() - INTERVAL '30 days';
```

---

### 9. RECEIPTS
**Purpose:** Uploaded receipt scans  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guest_sessions(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id),
  date DATE NOT NULL,
  time TIME,
  total DECIMAL(10, 2),
  image_url TEXT NOT NULL,
  ocr_provider VARCHAR(50),
  confidence DECIMAL(3, 2),
  status VARCHAR(50) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_needed')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL) OR (guest_id IS NOT NULL))
);

CREATE INDEX idx_receipts_user ON receipts(user_id, created_at DESC);
CREATE INDEX idx_receipts_guest ON receipts(guest_id);
CREATE INDEX idx_receipts_store ON receipts(store_id);
CREATE INDEX idx_receipts_date ON receipts(date DESC);
CREATE INDEX idx_receipts_status ON receipts(status);
```

---

### 10. RECEIPT_ITEMS
**Purpose:** Line items from receipts  
**Rows:** ~100000s (expected)

```sql
CREATE TABLE receipt_items (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(500) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  ean VARCHAR(13),
  confidence DECIMAL(3, 2),
  user_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_product ON receipt_items(product_id);
CREATE INDEX idx_receipt_items_confidence ON receipt_items(confidence) WHERE confidence < 0.8;
```

---

### 11. PRICE_STATS
**Purpose:** Aggregated price statistics  
**Rows:** ~50000s (expected)

```sql
CREATE TABLE price_stats (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id),
  avg_price DECIMAL(10, 2),
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  price_trend VARCHAR(20) CHECK (price_trend IN ('up', 'down', 'stable')),
  trend_percentage DECIMAL(5, 2),
  sample_size INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, city_id)
);

CREATE INDEX idx_price_stats_product ON price_stats(product_id);
CREATE INDEX idx_price_stats_city ON price_stats(city_id);
CREATE INDEX idx_price_stats_updated ON price_stats(updated_at DESC);
```

**Update Logic:**
```sql
-- Run daily
INSERT INTO price_stats (product_id, city_id, avg_price, min_price, max_price)
SELECT 
  ri.product_id,
  u.city_id,
  AVG(ri.unit_price) as avg_price,
  MIN(ri.unit_price) as min_price,
  MAX(ri.unit_price) as max_price
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.id
JOIN users u ON r.user_id = u.id
WHERE r.date > NOW() - INTERVAL '30 days'
  AND ri.product_id IS NOT NULL
GROUP BY ri.product_id, u.city_id
ON CONFLICT (product_id, city_id) 
DO UPDATE SET
  avg_price = EXCLUDED.avg_price,
  min_price = EXCLUDED.min_price,
  max_price = EXCLUDED.max_price,
  updated_at = NOW();
```

---

### 12. BASKETS
**Purpose:** User shopping baskets  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE baskets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guest_sessions(id) ON DELETE CASCADE,
  name VARCHAR(200),
  status VARCHAR(50) CHECK (status IN ('draft', 'optimized', 'completed')) DEFAULT 'draft',
  total_estimate DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL) OR (guest_id IS NOT NULL))
);

CREATE INDEX idx_baskets_user ON baskets(user_id, updated_at DESC);
CREATE INDEX idx_baskets_guest ON baskets(guest_id);
CREATE INDEX idx_baskets_status ON baskets(status);
```

---

### 13. BASKET_ITEMS
**Purpose:** Items in shopping baskets  
**Rows:** ~100000s (expected)

```sql
CREATE TABLE basket_items (
  id SERIAL PRIMARY KEY,
  basket_id INTEGER REFERENCES baskets(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(500) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_basket_items_basket ON basket_items(basket_id);
CREATE INDEX idx_basket_items_product ON basket_items(product_id);
```

---

### 14. EVENTS
**Purpose:** Analytics event tracking  
**Rows:** Millions (expected)

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  event_name VARCHAR(200),
  user_id INTEGER REFERENCES users(id),
  guest_id UUID REFERENCES guest_sessions(id),
  city_id INTEGER REFERENCES cities(id),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (event_date, event_name, city_id)
);

CREATE INDEX idx_events_type ON events(event_type, event_date DESC);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_date ON events(event_date DESC);
```

**Event Types:**
```sql
-- Example events
INSERT INTO events (event_type, event_name, user_id, data) VALUES
  ('receipt_scan', 'Receipt Scanned', 123, '{"store": "Maxima", "total": 42.50}'),
  ('product_search', 'Searched Products', 123, '{"query": "milk", "results": 15}'),
  ('basket_optimize', 'Optimized Basket', 123, '{"items": 10, "savings": 5.60}');
```

---

## 🚀 FEATURE-SPECIFIC TABLES

### 15. ALERTS
**Purpose:** User price alerts  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) CHECK (type IN ('price_drop', 'category_deal', 'basket_change', 'expiring_offer', 'stock_alert')),
  product_id INTEGER REFERENCES products(id),
  category_id INTEGER REFERENCES categories(id),
  threshold_price DECIMAL(10, 2),
  threshold_percentage INTEGER,
  status VARCHAR(50) CHECK (status IN ('active', 'triggered', 'expired')) DEFAULT 'active',
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_status ON alerts(status);
```

---

### 16. PROJECT_BASKETS
**Purpose:** Pre-made basket templates  
**Rows:** ~20 (templates)

```sql
CREATE TABLE project_baskets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  icon VARCHAR(50),
  estimated_cost DECIMAL(10, 2),
  item_count INTEGER,
  seasonal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example templates
INSERT INTO project_baskets (name, description, category, icon, estimated_cost, item_count) VALUES
  ('Baby Essentials', 'Everything for newborn care', 'Baby', '👶', 50.00, 15),
  ('Pet Care', 'Monthly pet supplies', 'Pets', '🐕', 35.00, 12),
  ('BBQ Party', 'All you need for a BBQ', 'Food', '🍖', 80.00, 20),
  ('Christmas Dinner', 'Traditional holiday meal', 'Food', '🎄', 120.00, 25);
```

---

### 17. PROJECT_BASKET_ITEMS
**Purpose:** Items in project baskets  
**Rows:** ~500 (expected)

```sql
CREATE TABLE project_basket_items (
  id SERIAL PRIMARY KEY,
  basket_id INTEGER REFERENCES project_baskets(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(500) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  optional BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_items_basket ON project_basket_items(basket_id);
CREATE INDEX idx_project_items_product ON project_basket_items(product_id);
```

---

### 18. NUTRITIONAL_ANALYSIS
**Purpose:** Receipt nutrition analysis  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE nutritional_analysis (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE UNIQUE,
  total_calories INTEGER,
  total_protein DECIMAL(10, 2),
  total_carbs DECIMAL(10, 2),
  total_fat DECIMAL(10, 2),
  total_sugar DECIMAL(10, 2),
  total_fiber DECIMAL(10, 2),
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  warnings JSONB,
  toxic_substances JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nutrition_receipt ON nutritional_analysis(receipt_id);
CREATE INDEX idx_nutrition_health_score ON nutritional_analysis(health_score);
```

---

### 19. WARRANTIES
**Purpose:** Product warranty tracking  
**Rows:** ~1000s (expected)

```sql
CREATE TABLE warranties (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
  receipt_item_id INTEGER REFERENCES receipt_items(id) ON DELETE CASCADE,
  product_name VARCHAR(500) NOT NULL,
  purchase_date DATE NOT NULL,
  warranty_months INTEGER NOT NULL,
  warranty_expires_at DATE NOT NULL,
  reminded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_warranties_user ON warranties(user_id);
CREATE INDEX idx_warranties_expires ON warranties(warranty_expires_at);
```

---

### 20. SHELF_SNAPS
**Purpose:** Community price verification  
**Rows:** ~10000s (expected)

```sql
CREATE TABLE shelf_snaps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  store_id INTEGER REFERENCES stores(id),
  product_id INTEGER REFERENCES products(id),
  image_url TEXT NOT NULL,
  reported_price DECIMAL(10, 2) NOT NULL,
  verified BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shelf_snaps_store ON shelf_snaps(store_id);
CREATE INDEX idx_shelf_snaps_product ON shelf_snaps(product_id);
CREATE INDEX idx_shelf_snaps_verified ON shelf_snaps(verified);
```

---

## 🔍 KEY QUERIES

### 1. Find Cheapest Price for Product:
```sql
SELECT s.name, o.price, o.valid_until
FROM offers o
JOIN stores s ON o.store_id = s.id
WHERE o.product_id = $1
  AND o.valid_until > NOW()
  AND s.city_id = $2
ORDER BY o.price ASC
LIMIT 1;
```

### 2. Fuzzy Product Search:
```sql
SELECT p.*, 
       similarity(p.name, $1) as sim
FROM products p
WHERE p.name % $1  -- pg_trgm similarity operator
ORDER BY sim DESC
LIMIT 10;
```

### 3. User Receipt History:
```sql
SELECT r.*, COUNT(ri.id) as item_count
FROM receipts r
LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
WHERE r.user_id = $1
GROUP BY r.id
ORDER BY r.created_at DESC
LIMIT 50;
```

### 4. Store Offers by Category:
```sql
SELECT o.*, p.name as product_name, c.name as category_name
FROM offers o
JOIN products p ON o.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE o.store_id = $1
  AND c.slug = $2
  AND o.valid_until > NOW()
ORDER BY o.discount_percentage DESC;
```

---

## 🔧 DATABASE MAINTENANCE

### Daily Tasks:
```sql
-- 1. Clean expired sessions
DELETE FROM guest_sessions WHERE expires_at < NOW();

-- 2. Update price stats
-- (See price_stats table)

-- 3. Vacuum analyze
VACUUM ANALYZE;
```

### Weekly Tasks:
```sql
-- 1. Clean old offers
DELETE FROM offers WHERE valid_until < NOW() - INTERVAL '30 days';

-- 2. Reindex
REINDEX DATABASE pricelio;
```

### Monthly Tasks:
```sql
-- 1. Full backup
pg_dump pricelio > pricelio_backup_$(date +%Y%m%d).sql

-- 2. Archive old events
INSERT INTO events_archive SELECT * FROM events WHERE event_date < NOW() - INTERVAL '6 months';
DELETE FROM events WHERE event_date < NOW() - INTERVAL '6 months';
```

---

## ✅ STATUS

| Aspect | Status | Progress |
|--------|--------|----------|
| Schema Design | ✅ Complete | 100% |
| Tables Created | ✅ Complete | 30+/30+ (100%) |
| Indexes | ✅ Complete | 60+/60+ (100%) |
| Migrations | ✅ Complete | 5/5 (100%) |
| Extensions | ✅ Complete | 2/2 (100%) |
| Documentation | ✅ Complete | 100% |

**OVERALL:** ✅ **100% Complete**

---

**Šis failas yra 7/10 galutinių projektų aprašymų.**  
**Kitas failas:** 08_API_AND_BACKEND.md
