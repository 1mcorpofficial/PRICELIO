# 🎯 ReceiptRadar - AI-Powered Price Intelligence Platform

**ReceiptRadar** (Pricelio) is a comprehensive mobile-first price and promo intelligence platform that helps Lithuanian consumers save money by comparing real paid prices (from receipts) with flyer deals and online offers across 21 major store chains.

## 🌟 Core Value Proposition

- **After Purchase**: Scan receipts with AI to see overpaid items, get nutritional analysis, and track warranties
- **Before Purchase**: Build smart baskets using project templates and get optimized shopping plans across 1-2 stores
- **In-Store**: Scan barcodes to instantly compare prices and find better options nearby
- **Price Alerts**: Get personalized notifications when your favorite products drop in price
- **Categories**: Grocery, DIY/Hardware, Books, Beauty/Pharmacy, Electronics, Wine & Spirits

## ⚡ What Makes Us Different

- ✅ **21 Store Chains** - Complete coverage of Lithuanian retail (Maxima, Rimi, Lidl, Senukai, and 17 more)
- ✅ **93+ Physical Stores** - Real addresses and locations in Vilnius, Kaunas, Klaipėda, Šiauliai
- ✅ **AI-Powered OCR** - Multi-provider receipt extraction (OpenAI GPT-4 Vision, Claude, Tesseract)
- ✅ **Smart Features** - Barcode scanning, shelf price verification, nutritional analysis
- ✅ **Project Baskets** - Pre-made templates for baby, pets, DIY, parties, and more
- ✅ **Real-Time Alerts** - Personalized price drop notifications

## ✨ Features Implemented (100% Complete!)

### 🤖 AI-Powered Receipt Processing
- Multi-provider OCR (OpenAI GPT-4 Vision, Anthropic Claude, Tesseract OCR)
- Intelligent product matching with fuzzy search (pg_trgm)
- Confidence scoring and low-confidence review workflow
- Automatic alias learning
- **NEW:** Nutritional analysis (calories, E-additives, allergens, sugar content)
- **NEW:** PII masking for privacy protection

### 💰 Price Intelligence - 21 Store Chains!
- **🛒 Grocery (7)**: Maxima, Rimi, Iki, Norfa, Šilas, Lidl, **Aibė** 🆕
- **🔨 DIY/Furniture (4)**: Senukai, Moki Veži, **Topo Centras** 🆕, **JYSK** 🆕
- **📚 Books (2)**: Ermitažas, **Pegasas** 🆕
- **💄💊 Beauty/Pharmacy (4)**: Drogas, Eurovaistinė, Gintarinė vaistinė, **Camelia** 🆕
- **💻 Electronics (3)**: Varle.lt, Elektromarkt, Pigu.lt
- **🍷 Wine & Spirits (1)**: **Vynoteka** 🆕

**93+ Physical Stores** with real addresses, coordinates, and phone numbers in:
- 🏙️ Vilnius (53+ stores)
- 🏙️ Kaunas (17+ stores)
- 🏙️ Klaipėda (5+ stores)
- 🏙️ Šiauliai (1+ stores)

### 🛒 Smart Basket Optimizer
- Single-store optimization with price comparison
- **NEW:** 2-store optimizer with travel cost calculation
- **NEW:** Project Basket Templates:
  - 👶 Baby (Naujagimio Komplektas)
  - 🐕 Pet Dog (Šunims - Mėnesio Atsargos)
  - 🐱 Pet Cat (Katėms - Mėnesio Atsargos)
  - 🎨 DIY Paint (Dažymo Projektas)
  - 🌱 Garden Tools (Sodo Įrankiai)
  - 🛒 Weekly Grocery (4 žmonėms)
  - 🎉 Party (10 žmonių)
- Real-time price comparison across all stores
- Savings calculation vs median prices
- Alternative store suggestions

### 🆕 Special Features (Moat!)
- **📸 ShelfSnap**: Photo shelf labels for community price verification
- **🔍 Barcode Scanner**: In-store scanning with instant price comparison
- **⚠️ Package Size Trap Detector**: Alerts when smaller packages are cheaper per unit
- **📋 Receipt Warranty Vault**: Track warranty items with expiration reminders
- **🍎 Nutritional Analysis**: E-additives, sugar content, allergen warnings per receipt
- **🔔 Personalized Alerts**:
  - Price drop notifications
  - Basket ready alerts (when items go on sale)
  - Expiring soon warnings
  - Category deal alerts

### 👨‍💼 Admin Dashboard
- Data quality review and analytics
- Low confidence receipt handling
- Unmatched product mapping
- Connector health monitoring (21 connectors)
- Manual product alias creation
- ShelfSnap verification queue
- User reputation management

### 🔐 Full Authentication & Security
- User registration & login with JWT
- Refresh token rotation
- Guest session support
- Protected API endpoints
- PII masking on receipts
- GDPR-compliant data controls

### 📊 Analytics & KPIs
- Event tracking (receipt scans, basket creates, searches)
- Receipt, basket, and offer metrics
- Retention analysis and cohort tracking
- Connector performance monitoring
- User engagement dashboards
- Queue-based event processing

### 🛒 Basket Planning with Product Selection
- Search products with images and descriptions
- Category filters (Food, Vegetables, Dairy, etc.)
- Store chain filters
- Visual product selection interface
- Real-time basket total calculation
- Easy quantity adjustment

### 🍎 Nutritional Analysis with E-Substances
- Automatic nutritional data extraction from receipts
- Calorie, protein, carbs, fat, sugar tracking
- **Harmful E-substance identification** (E471, E300, E621, etc.)
- Allergen warnings
- Health score calculation
- Total sugar and salt monitoring
- Visual nutrition reports

## 🚀 Quick Start

## 🧪 Dev in 5 Steps

1) `npm run doctor`
2) `npm run install:all`
3) `npm run dev:infra` (if port 5432 is busy, set `POSTGRES_PORT=55432` in `infra/.env`)
4) Create missing `.env` files from `.env.example` or docs (use strong secrets)
5) `npm run dev:services`

Stop infra with: `npm run dev:infra:down`

### Option A: Automated Setup with Real Data (Recommended)

```bash
# Run the automated setup script with REAL addresses
./setup-real-stores.sh

# This will:
# - Check database connection
# - Run migrations with real store data
# - Add all 15 store chains with 70+ real addresses
# - Install dependencies
# - Test all 15 connectors
```

### Option B: Manual Setup

### 1. Start Infrastructure

```bash
cd infra
docker compose up -d
```

This starts PostgreSQL, Redis, RabbitMQ, and MinIO.

### 2. Run Services

```bash
# API Service (port 3000)
cd services/api && npm install && npm run dev

# AI Gateway (port 3001) - ADD YOUR API KEYS!
cd services/ai-gateway && npm install && npm run dev

# Receipt Worker
cd services/receipts && npm install && npm run dev

# Ingest Service (port 3002)
cd services/ingest && npm install && npm run dev

# Admin Panel (port 3003)
cd apps/admin && npm install && npm run dev

# Analytics (port 3004)
cd services/analytics && npm install && npm run dev

# PWA Frontend (port 8000)
python -m http.server 8000
```

### 3. Access Points

- **PWA**: http://localhost:8000
- **API**: http://localhost:3000
- **Admin**: http://localhost:3003 (login: ADMIN_EMAIL / password for ADMIN_PASSWORD_HASH)

## 📚 Documentation

### Core Documentation:
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Full feature list and architecture
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions
- **[docs/](docs/)** - Complete specification and design docs

### New Features (2026-01-21):
- **[ALL_15_CHAINS_COMPLETE.md](ALL_15_CHAINS_COMPLETE.md)** - All 15 chains with real data! 🎉
- **[NEW_FEATURES_SUMMARY.md](NEW_FEATURES_SUMMARY.md)** - Latest features overview
- **[STORE_CHAINS_COMPLETE.md](STORE_CHAINS_COMPLETE.md)** - Store chains documentation
- **[docs/ALL_STORE_CHAINS.md](docs/ALL_STORE_CHAINS.md)** - Detailed chain information

### Setup Scripts:
- **`setup-real-stores.sh`** - Setup all 15 chains with real addresses ⭐
- **`setup-all-stores.sh`** - Previous version (9 chains)
- **`services/ingest/test-all-connectors.js`** - Test all 15 scrapers

## 🏗️ Architecture

```
Frontend (PWA) → API Service → AI Gateway / Receipt Worker / Ingest / Analytics
                      ↓
          PostgreSQL + Redis + RabbitMQ
```

## 🔑 Key Technologies

- **Backend**: Node.js, Express
- **Database**: PostgreSQL with pg_trgm for fuzzy matching
- **Queue**: RabbitMQ for async processing
- **Cache**: Redis
- **AI**: OpenAI GPT-4 Vision / Anthropic Claude / Tesseract
- **Frontend**: Vanilla JS PWA with Service Worker
- **Map**: Leaflet + OpenStreetMap

## 📦 Project Structure

```
├── apps/
│   ├── admin/          # Admin dashboard
│   └── web/            # Future production PWA
├── services/
│   ├── ai-gateway/     # OCR and extraction
│   ├── analytics/      # Event tracking & KPIs
│   ├── api/            # Main backend API
│   ├── ingest/         # Flyer scraping
│   └── receipts/       # Receipt processing
├── db/                 # Database schema & seeds
├── docs/               # Complete specification
├── infra/              # Docker compose setup
├── index.html          # PWA UI
├── app.js              # PWA logic
└── styles.css          # PWA styling
```

## 🧪 Testing

Upload a receipt:
```bash
curl -X POST http://localhost:3000/receipts/upload \
  -F "file=@receipt.jpg"
```

Create and optimize a basket:
```bash
curl -X POST http://localhost:3000/baskets \
  -d '{"name":"Test"}' -H "Content-Type: application/json"
```

## 🔒 Security

- JWT authentication
- Password hashing
- Guest session support
- SQL injection protection
- CORS configuration

## 📈 What's Next

- [ ] Add real AI API keys (OpenAI/Anthropic)
- [ ] Deploy to production
- [ ] Two-store optimization algorithm
- [ ] Barcode scanning (ShelfSnap mode)
- [ ] Personalized price alerts
- [ ] Mobile app (React Native)

## 📄 License

Proprietary - Built for the Lithuanian market

---

**Built with ❤️ for smart shoppers**
