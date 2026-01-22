# 🏗️ TECHNINĖ ARCHITEKTŪRA

**Failas:** 03_TECHNICAL_ARCHITECTURE.md  
**Kategorija:** Architektūra  
**Versija:** 6.0 Final  
**Data:** 2026-01-22

---

## 🎯 ARCHITECTURE OVERVIEW

### Architektūros Principai:
1. **Microservices:** Modulinė, skalojama struktūra
2. **Event-Driven:** Asinchroninis komunikavimas
3. **API-First:** RESTful API design
4. **Cloud-Ready:** Docker, horizontalus skaljavimas
5. **Mobile-First:** PWA frontend
6. **AI-Powered:** AI Gateway abstraction

---

## 🔷 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PWA (Progressive Web App)                           │  │
│  │  - 7 HTML Pages                                      │  │
│  │  - styles.css (Orange Theme)                         │  │
│  │  - app.js (Main Logic)                               │  │
│  │  - Service Worker + Manifest                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Service (Node.js + Express)                     │  │
│  │  - 60+ REST Endpoints                                │  │
│  │  - JWT Authentication                                │  │
│  │  - Rate Limiting                                     │  │
│  │  - Request Validation                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          │              │              │              │
    ┌─────┴─────┐  ┌────┴────┐  ┌─────┴─────┐  ┌────┴─────┐
    ▼           ▼  ▼         ▼  ▼           ▼  ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐
│Receipt │ │ Ingest │ │   AI   │ │Analytics│ │  Auth  │ │Admin│
│Service │ │Service │ │Gateway │ │ Service │ │Service │ │Panel│
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └─────┘
    │           │           │           │
    │           │           │           │
    └───────────┴───────────┴───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │ RabbitMQ │  │  MinIO   │   │
│  │(Primary) │  │ (Cache)  │  │ (Queue)  │  │(Storage) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 TECHNOLOGY STACK

### Frontend:
| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5** | - | Structure |
| **CSS3** | - | Styling (Orange Theme) |
| **JavaScript** | ES6+ | Logic |
| **Service Worker** | - | PWA offline support |
| **Manifest** | - | PWA installability |

### Backend:
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18 LTS | Runtime |
| **Express.js** | 4.18+ | Web framework |
| **PostgreSQL** | 15 | Primary database |
| **Redis** | 7 | Caching |
| **RabbitMQ** | 3.12 | Message queue |
| **MinIO** | Latest | Object storage |

### AI/ML:
| Technology | Version | Purpose |
|------------|---------|---------|
| **OpenAI GPT-4o** | - | Primary AI |
| **Anthropic Claude** | - | Fallback AI |
| **Tesseract** | 5.0+ | Local OCR |

### DevOps:
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 24+ | Containerization |
| **Docker Compose** | 2.0+ | Orchestration |
| **Git** | - | Version control |

---

## 🎯 MICROSERVICES DETAILED

### 1. API SERVICE
**Port:** 4000  
**Path:** `services/api/`  
**Dependencies:** PostgreSQL, Redis

#### Responsibilities:
- Handle all HTTP requests from frontend
- Authentication & authorization
- Business logic orchestration
- Response formatting
- Rate limiting

#### Key Endpoints:
```javascript
// Store & Search
GET  /api/stores              // List stores
GET  /api/search              // Search products
GET  /api/products/:id        // Product details

// Basket
POST /api/basket/optimize     // Optimize basket
POST /api/basket/two-stores   // 2-store optimization

// Receipt
POST /api/receipts/upload     // Upload receipt
GET  /api/receipts/:id        // Receipt details
POST /api/receipts/:id/confirm // Confirm corrections

// User
POST /api/auth/register       // User registration
POST /api/auth/login          // User login
GET  /api/user/stats          // User statistics

// Alerts
GET  /api/alerts              // Get user alerts
POST /api/alerts/subscribe    // Subscribe to alerts

// Nutrition
GET  /api/nutrition/:receiptId // Get nutrition analysis
```

#### Environment Variables:
```bash
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/pricelio
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

---

### 2. RECEIPT PROCESSING SERVICE
**Port:** 4001  
**Path:** `services/receipts/`  
**Dependencies:** AI Gateway, PostgreSQL, RabbitMQ, MinIO

#### Responsibilities:
- Process receipt upload queue
- Call AI Gateway for extraction
- Match products to database
- Handle low-confidence items
- Perform nutritional analysis

#### Pipeline Stages:
```javascript
// 1. Upload Validation
validateReceipt(file) {
  - Check file size (<5MB)
  - Check file type (jpg, png, pdf)
  - Check image quality
}

// 2. Image Preprocessing
preprocessImage(file) {
  - Rotate if needed
  - Enhance contrast
  - Remove noise
  - Convert to grayscale
}

// 3. AI Extraction (2-stage)
extractReceipt(image) {
  // Stage 1: Full extraction
  const full = await aiGateway.extract(image, 'full');
  
  // Stage 2: Targeted re-extraction
  const lowConfidence = full.items.filter(i => i.confidence < 0.8);
  for (let item of lowConfidence) {
    const focused = await aiGateway.extract(image, 'focused', item.bbox);
    Object.assign(item, focused);
  }
  
  return full;
}

// 4. Product Matching
matchProducts(items) {
  for (let item of items) {
    // Try barcode first
    let match = await findByBarcode(item.ean);
    
    // Try brand + pack + variant
    if (!match) {
      match = await findByBrandPack(item.brand, item.pack, item.variant);
    }
    
    // Try fuzzy matching
    if (!match) {
      match = await fuzzyMatch(item.name);
    }
    
    item.product_id = match?.id;
    item.confidence = match?.confidence || 0;
  }
}

// 5. Save to Database
saveReceipt(receipt) {
  await db.query('INSERT INTO receipts ...');
  await db.query('INSERT INTO receipt_items ...');
}

// 6. Nutritional Analysis
analyzeNutrition(receiptId) {
  const items = await getReceiptItems(receiptId);
  const analysis = await aiGateway.analyzeNutrition(items);
  await db.query('INSERT INTO nutritional_analysis ...');
}
```

#### Queue Configuration:
```javascript
// RabbitMQ
const QUEUES = {
  receiptUpload: 'receipt.upload',
  receiptProcess: 'receipt.process',
  nutritionAnalysis: 'nutrition.analyze'
};

// Consumers
channel.consume(QUEUES.receiptUpload, processReceiptJob);
channel.consume(QUEUES.nutritionAnalysis, analyzeNutritionJob);
```

---

### 3. AI GATEWAY SERVICE
**Port:** 4002  
**Path:** `services/ai-gateway/`  
**Dependencies:** OpenAI API, Anthropic API, Tesseract

#### Responsibilities:
- Abstract AI provider logic
- Handle provider failover
- Rate limiting & retries
- Cost tracking
- 7 AI helper functions

#### AI Providers:
```javascript
const PROVIDERS = {
  openai: {
    priority: 1,
    cost: 0.01, // per request
    timeout: 30000,
    maxRetries: 2
  },
  anthropic: {
    priority: 2,
    cost: 0.015,
    timeout: 30000,
    maxRetries: 2
  },
  tesseract: {
    priority: 3,
    cost: 0, // local
    timeout: 60000,
    maxRetries: 1
  }
};
```

#### 7 AI Functions:
```javascript
// 1. Receipt Extraction
POST /extract
  - Input: Image (base64 or URL)
  - Output: { items: [...], store: {...}, total: X }

// 2. Store Data Extraction
POST /ai/extract-store-data
  - Input: HTML or URL
  - Output: { offers: [...] }

// 3. Price Analysis
POST /ai/analyze-prices
  - Input: { products: [...] }
  - Output: { insights: [...] }

// 4. Basket Optimization
POST /ai/optimize-basket
  - Input: { items: [...], stores: [...] }
  - Output: { plan: {...} }

// 5. Nutritional Analysis
POST /ai/analyze-nutrition
  - Input: { products: [...] }
  - Output: { nutrition: {...}, toxic: [...] }

// 6. Product Comparison
POST /ai/compare-products
  - Input: { product1: {...}, product2: {...} }
  - Output: { comparison: {...} }

// 7. Smart Search
POST /ai/smart-search
  - Input: { query: "..." }
  - Output: { results: [...] }

// 8. AI Assistant
POST /ai/assistant
  - Input: { question: "..." }
  - Output: { answer: "..." }
```

#### Failover Logic:
```javascript
async function callAI(prompt, options = {}) {
  const providers = getSortedProviders(); // by priority
  
  for (let provider of providers) {
    try {
      const result = await provider.call(prompt, options);
      trackCost(provider.name, provider.cost);
      return result;
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error);
      // Try next provider
    }
  }
  
  throw new Error('All AI providers failed');
}
```

---

### 4. INGEST SERVICE
**Port:** 4003  
**Path:** `services/ingest/`  
**Dependencies:** PostgreSQL, AI Gateway (for scraping)

#### Responsibilities:
- Fetch flyers from 21 store chains
- Extract offers from PDFs/HTML
- Normalize data
- Publish to database
- Schedule cron jobs

#### 21 Connectors:
```javascript
// Grocery (7)
connectors/maxima.js
connectors/rimi.js
connectors/iki.js
connectors/norfa.js
connectors/silas.js
connectors/lidl.js
connectors/aibe.js

// DIY (4)
connectors/senukai.js
connectors/moki-vezi.js
connectors/topo-centras.js
connectors/jysk.js

// Books (2)
connectors/ermitazas.js
connectors/pegasas.js

// Pharmacy (4)
connectors/drogas.js
connectors/eurovaistin.js
connectors/gintarine.js
connectors/camelia.js

// Electronics (3)
connectors/varle.js
connectors/elektromarkt.js
connectors/pigu.js

// Wine (1)
connectors/vynoteka.js
```

#### Connector Template:
```javascript
// connectors/example.js
module.exports = {
  name: 'Example Store',
  url: 'https://example.lt/akcijos',
  
  async fetch() {
    const response = await axios.get(this.url);
    return response.data;
  },
  
  async extract(html) {
    const $ = cheerio.load(html);
    const offers = [];
    
    $('.product').each((i, el) => {
      offers.push({
        name: $(el).find('.name').text(),
        price: parseFloat($(el).find('.price').text()),
        old_price: parseFloat($(el).find('.old-price').text()),
        image: $(el).find('img').attr('src'),
        valid_from: $(el).find('.valid-from').text(),
        valid_until: $(el).find('.valid-until').text()
      });
    });
    
    return offers;
  },
  
  async normalize(offers) {
    return offers.map(offer => ({
      store_id: this.getStoreId(),
      product_name: normalizeProductName(offer.name),
      price: offer.price,
      old_price: offer.old_price,
      discount_percentage: calculateDiscount(offer.price, offer.old_price),
      valid_from: parseDate(offer.valid_from),
      valid_until: parseDate(offer.valid_until),
      image_url: normalizeImageUrl(offer.image)
    }));
  },
  
  async publish(offers) {
    for (let offer of offers) {
      await db.query(`
        INSERT INTO offers (store_id, product_name, price, ...)
        VALUES ($1, $2, $3, ...)
        ON CONFLICT (store_id, product_name, valid_from) DO UPDATE
        SET price = EXCLUDED.price, ...
      `, [offer.store_id, offer.product_name, offer.price, ...]);
    }
  }
};
```

#### Scheduler:
```javascript
// src/scheduler.js
const cron = require('node-cron');

// Run every day at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log('Starting daily ingest...');
  
  for (let connector of ALL_CONNECTORS) {
    try {
      const html = await connector.fetch();
      const offers = await connector.extract(html);
      const normalized = await connector.normalize(offers);
      await connector.publish(normalized);
      console.log(`✅ ${connector.name}: ${normalized.length} offers`);
    } catch (error) {
      console.error(`❌ ${connector.name} failed:`, error);
    }
  }
});
```

---

### 5. ANALYTICS SERVICE
**Port:** 4004  
**Path:** `services/analytics/`  
**Dependencies:** PostgreSQL, RabbitMQ

#### Responsibilities:
- Track user events
- Aggregate KPIs
- Generate reports
- Dashboard data

#### Event Types:
```javascript
const EVENT_TYPES = [
  'receipt_scan',
  'product_search',
  'basket_create',
  'basket_optimize',
  'price_compare',
  'store_view',
  'alert_sent',
  'user_register',
  'user_login'
];
```

#### Event Processing:
```javascript
// Consume events from queue
channel.consume('analytics.events', async (msg) => {
  const event = JSON.parse(msg.content.toString());
  
  // Store in events table
  await db.query(`
    INSERT INTO events (event_type, user_id, data, timestamp)
    VALUES ($1, $2, $3, $4)
  `, [event.type, event.userId, event.data, new Date()]);
  
  // Update aggregated metrics
  await updateMetrics(event);
  
  channel.ack(msg);
});
```

---

### 6. ADMIN PANEL
**Port:** 3000  
**Path:** `apps/admin/`  
**Dependencies:** PostgreSQL, API Service

#### Responsibilities:
- Review low-confidence receipt items
- Manage product aliases
- View system metrics
- User management
- Data quality tools

#### Features:
- **Pending Review:** List of items <80% confidence
- **Approve/Reject:** Manual product matching
- **Add Alias:** Create product aliases
- **Metrics Dashboard:** System health & KPIs
- **User Lookup:** Search users, view activity

---

## 🗄️ DATABASE ARCHITECTURE

### PostgreSQL Schema:
```sql
-- Core Tables (30+)
cities (4 rows)
users (~1000s)
guest_sessions (~10000s)
categories (20 rows)
stores (93 rows)
products (~50000s)
product_aliases (~10000s)
offers (~100000s)
receipts (~10000s)
receipt_items (~100000s)
price_stats (aggregated)
baskets (~10000s)
basket_items (~100000s)
events (millions)
alerts (~10000s)
project_baskets (10 templates)
nutritional_analysis (~10000s)
warranties (~1000s)
shelf_snaps (~10000s)
```

### Indexes:
```sql
-- Performance indexes
CREATE INDEX idx_offers_store_product ON offers(store_id, product_id);
CREATE INDEX idx_offers_valid ON offers(valid_until) WHERE valid_until > NOW();
CREATE INDEX idx_receipts_user ON receipts(user_id, created_at DESC);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_events_type_date ON events(event_type, event_date);
```

### Extensions:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Fuzzy matching
CREATE EXTENSION IF NOT EXISTS postgis; -- Geolocation (future)
```

---

## 📦 DATA FLOW EXAMPLES

### Receipt Scan Flow:
```
1. User uploads image via PWA
2. Frontend: POST /api/receipts/upload
3. API Service: Save to MinIO, publish to queue
4. Receipt Service: Consume from queue
5. Receipt Service: Call AI Gateway
6. AI Gateway: Call OpenAI (or fallback)
7. Receipt Service: Match products
8. Receipt Service: Save to PostgreSQL
9. Receipt Service: Publish nutrition job
10. Receipt Service: Notify user via websocket
11. Analytics Service: Track event
```

### Price Search Flow:
```
1. User types "milk" in search
2. Frontend: GET /api/search?q=milk
3. API Service: Check Redis cache
4. Cache miss → Query PostgreSQL
5. PostgreSQL: Full-text + fuzzy search
6. API Service: Aggregate results
7. API Service: Cache in Redis (5 min TTL)
8. API Service: Return to frontend
9. Frontend: Render results
10. Analytics Service: Track search event
```

### Basket Optimization Flow:
```
1. User adds 10 items to basket
2. User clicks "Optimize"
3. Frontend: POST /api/basket/optimize
4. API Service: Get user location
5. API Service: Get nearby stores
6. API Service: Query prices for all items
7. API Service: Calculate 1-store plan
8. API Service: Calculate 2-store plan (if enabled)
9. API Service: Compare travel costs
10. API Service: Return best plan
11. Frontend: Display results
12. AI Gateway: Analyze plan (optional enhancement)
```

---

## 🔐 SECURITY ARCHITECTURE

### Authentication:
- **JWT Tokens:** 30-day expiry
- **Guest Sessions:** UUID-based, 7-day expiry
- **Password Hashing:** bcrypt, cost factor 10
- **API Keys:** For AI providers, stored in .env

### Authorization:
- **User Roles:** user, admin
- **Endpoint Protection:** JWT middleware
- **Rate Limiting:** 100 req/15min per IP

### Data Protection:
- **PII Masking:** Auto-mask sensitive data
- **HTTPS Only:** Force SSL in production
- **CORS:** Whitelist frontend origin
- **SQL Injection:** Parameterized queries

---

## 📊 SCALABILITY

### Horizontal Scaling:
- **API Service:** Multiple instances behind load balancer
- **Workers:** Multiple receipt/ingest workers
- **Database:** Read replicas for queries

### Caching Strategy:
```javascript
// L1: Redis (shared)
- Store data: 1 hour TTL
- Search results: 5 min TTL
- User sessions: 30 day TTL

// L2: In-memory (per instance)
- Categories: Infinite TTL
- Product catalog: 1 hour TTL
```

### Performance Targets:
- **API Response:** <500ms (p95)
- **Receipt Processing:** <30s (p95)
- **Search:** <200ms (p95)
- **Database Queries:** <100ms (p95)

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Development:
```bash
docker-compose up
# All services run locally
```

### Production (Future):
```
Frontend → CDN (Cloudflare)
API → Kubernetes (3 pods)
Workers → Kubernetes (5 pods)
PostgreSQL → Managed (AWS RDS / DigitalOcean)
Redis → Managed
RabbitMQ → Managed
MinIO → S3-compatible storage
```

---

**Šis failas yra 3/10 galutinių projektų aprašymų.**  
**Kitas failas:** 04_AI_SYSTEM.md
