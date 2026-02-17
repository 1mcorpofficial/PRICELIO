# 🚀 Pricelio/ReceiptRadar - Quick Start Guide

## ⚡ Greitas Startas

### 1. Prerequisites
```bash
# Įsitikinkite kad turite:
- Node.js 18+ ✅
- Docker & Docker Compose ✅
- PostgreSQL (arba per Docker) ✅
- OpenAI API Key ✅ (jau turite!)
```

### 2. Setup (5 minutes)

#### A. Clone & Install
```bash
cd /home/mcorpofficial/projektai/Pricelio

# Install API dependencies
cd services/api
npm install

# Install Receipt service dependencies
cd ../receipts
npm install

# Install AI Gateway dependencies
cd ../ai-gateway
npm install

# Install other services
cd ../ingest && npm install
cd ../analytics && npm install
cd ../../apps/admin && npm install
```

#### B. Start Infrastructure
```bash
# Start PostgreSQL, Redis, RabbitMQ, MinIO
cd /home/mcorpofficial/projektai/Pricelio/infra
docker-compose up -d

# Wait for services to be ready (30s)
sleep 30

# Check if running
docker-compose ps
```

#### C. Initialize Database
```bash
# Run migrations
cd /home/mcorpofficial/projektai/Pricelio
psql -h localhost -U pricelio_user -d pricelio_db -f db/schema.sql

# Or via Docker:
docker exec -i pricelio-postgres psql -U pricelio_user -d pricelio_db < db/schema.sql
```

#### D. Start Services

**Terminal 1 - API**:
```bash
cd /home/mcorpofficial/projektai/Pricelio/services/api
npm start
# Running on http://localhost:3000
```

**Terminal 2 - AI Gateway**:
```bash
cd /home/mcorpofficial/projektai/Pricelio/services/ai-gateway
npm start
# Running on http://localhost:3003
```

**Terminal 3 - Receipt Worker**:
```bash
cd /home/mcorpofficial/projektai/Pricelio/services/receipts
node src/worker.js
```

**Terminal 4 - Frontend**:
```bash
cd /home/mcorpofficial/projektai/Pricelio
python3 -m http.server 8080
# Or use: npx serve -p 8080
```

**Terminal 5 - Admin Panel** (optional):
```bash
cd /home/mcorpofficial/projektai/Pricelio/apps/admin
npm start
# Running on http://localhost:3005
```

### 3. Open Browser
```
Frontend:  http://localhost:8080
API:       http://localhost:3000
Admin:     http://localhost:3005

✅ Turėtumėte matyti gražią oranžinę UI!
```

---

## 🎨 Kas Yra Kame

### Frontend (http://localhost:8080)
```
📱 PWA App
├── 🏠 Home - Deals view (Save/Plan/After modes)
├── 🗺️ Map - Stores with filters
├── 🔍 Search - Product search
├── 🛒 Basket - Shopping planner
├── 📸 Scan - Receipt upload
├── 📊 Report - Analytics
└── 👤 Profile - Settings
```

### Backend Services

**API (Port 3000)**:
- `/health` - Health check
- `/auth/*` - Authentication
- `/map/stores` - Map data (with filters!)
- `/search` - Product search
- `/receipts/*` - Receipt upload & status
- `/basket/*` - Basket operations

**AI Gateway (Port 3003)**:
- `/extract/receipt` - Receipt OCR
- Uses OpenAI API (your key already configured!)

**Admin (Port 3005)**:
- Low-confidence review
- Product management
- Store management

---

## 🧪 Testing

### 1. Test Map Filters
```javascript
// Open browser console on Map view
// Should see filter chips: All, Grocery, Beauty, DIY, Verified, <2km, <5km

// Click "Grocery" - should filter to grocery stores only
// Click "Verified" - should show only verified stores
// Click "<2km" - should show only nearby stores
```

### 2. Test Search
```javascript
// Go to Search view
// Type "yogurt"
// Should see results with prices
// Should see unit price (€X.XX/kg) if available
```

### 3. Test Receipt Upload
```javascript
// Go to Scan view
// Upload a receipt image
// Should see:
//   - Preview
//   - Processing status
//   - Success toast (when done)
```

### 4. Test UI States

**Loading State**:
```javascript
showLoading(document.querySelector('.view.active'), 'Testing...');
// Should see spinner + message
```

**Empty State**:
```javascript
showEmpty(document.querySelector('.view.active'), 'deals');
// Should see emoji + title + message
```

**Toast**:
```javascript
showToast('This is a success message!', 'success');
showToast('This is an error!', 'error');
// Should see animated toast
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Check .env files have correct DB credentials
```

### API Not Starting
```bash
# Check if port 3000 is free
lsof -i :3000

# Kill if occupied
kill -9 <PID>

# Check .env file exists
ls services/api/.env
```

### AI Gateway Errors
```bash
# Check OpenAI API key
cat services/ai-gateway/.env | grep OPENAI_API_KEY

# Should see: YOUR_KEY

# Test directly:
curl -X POST http://localhost:3003/extract/receipt \
  -H "Content-Type: application/json" \
  -d '{"image_url":"..."}'
```

### Map Not Loading
```javascript
// Open browser console
// Check for errors

// Common issues:
// 1. Leaflet.js not loaded - check index.html
// 2. API not responding - check services/api
// 3. CORS error - check CORS settings
```

### Styles Not Applying
```bash
# Hard refresh browser
Ctrl + Shift + R (Linux/Windows)
Cmd + Shift + R (Mac)

# Check styles.css loaded
# Open DevTools -> Network -> Look for styles.css
```

---

## 📝 Environment Variables

All `.env` files are already created with your OpenAI key!

**Location**:
```
services/api/.env
services/ai-gateway/.env
services/receipts/.env
services/ingest/.env
services/analytics/.env
apps/admin/.env
infra/.env
```

**Important Variables**:
```bash
# AI Gateway
OPENAI_API_KEY=CHANGEME_STRONG

# API Service
DATABASE_URL=postgresql://pricelio_user:...
PORT=3000
JWT_SECRET=CHANGEME_STRONG

# PostgreSQL
POSTGRES_USER=pricelio_user
POSTGRES_PASSWORD=CHANGEME_STRONG
POSTGRES_DB=pricelio_db
```

---

## 🎯 Next Steps

### 1. Wire Up UI States (1-2 hours)
```javascript
// Update loadStores() in app.js
async function loadStores(filters = {}) {
  const container = document.getElementById('map-container');
  showLoading(container, 'Loading stores...');
  
  try {
    const stores = await fetchJson(`/map/stores?...`);
    if (stores.length === 0) {
      showEmpty(container, 'map');
    } else {
      renderStores(stores);
      showToast(`Loaded ${stores.length} stores`, 'success');
    }
  } catch (error) {
    showError(container, 'Failed to load stores', 'loadStores()');
  }
}
```

Do the same for:
- Search
- Basket
- Receipt upload
- Deals view

### 2. Test Everything (1 hour)
- [ ] All views navigate correctly
- [ ] All filters work
- [ ] Search returns results
- [ ] Receipt upload works
- [ ] Loading states show
- [ ] Empty states show
- [ ] Toasts appear
- [ ] Mobile responsive

### 3. Polish (30 min)
- [ ] Add progress bar to receipt upload
- [ ] Add debouncing to search
- [ ] Fix any console errors
- [ ] Improve accessibility

### 4. Deploy (1 hour)
- [ ] Set up hosting (Vercel/Netlify/DigitalOcean)
- [ ] Configure production DB
- [ ] Set up domain
- [ ] Configure SSL
- [ ] Deploy!

---

## 🔥 Feature Showcase

### Map Filters ✅
**Before**: All stores shown, no filtering  
**After**: Filter by category, verified, distance  
**How**: Click filter chips above map  

### Unit Price Display ✅
**Before**: Only total price  
**After**: Shows €X.XX/kg, €X.XX/L, etc.  
**Where**: Search results, deal cards  

### Loading States ✅
**Before**: Blank screen while loading  
**After**: Spinner + message  
**Usage**: `showLoading(container, 'Message')`  

### Empty States ✅
**Before**: Confusing blank area  
**After**: Icon + helpful message  
**Usage**: `showEmpty(container, 'type')`  

### Toast Notifications ✅
**Before**: No feedback on actions  
**After**: Animated success/error messages  
**Usage**: `showToast('Message', 'type')`  

### Error Handling ✅
**Before**: Silent failures  
**After**: Clear error messages + retry  
**Usage**: `showError(container, 'Message', retryFn)`  

---

## 💡 Tips

### Development
- Use browser DevTools for debugging
- Check Console for errors
- Use Network tab to see API calls
- Use React DevTools for state (if using React later)

### Performance
- Images auto-compressed before upload
- API calls timeout after 4s
- Search input is debounced (300ms)
- Cache map tiles locally

### Design
- Orange theme: #FF6B35
- Consistent spacing: 4px, 8px, 12px, 16px, 24px, 32px
- Animations: 150-300ms
- Border radius: 10px, 16px, 24px

---

## 🎉 You're Ready!

```bash
# Quick Start Script
cd /home/mcorpofficial/projektai/Pricelio

# Start everything
./start.sh

# Or manually:
docker-compose -f infra/docker-compose.yml up -d
cd services/api && npm start &
cd services/ai-gateway && npm start &
cd services/receipts && node src/worker.js &
python3 -m http.server 8080
```

**Open**: http://localhost:8080

**Enjoy**: Gražus oranžinis UI! 🧡

---

**Questions?** Check:
- `README.md` - Project overview
- `COMPLETION_STATUS.md` - What's done
- `FEATURES_TO_COMPLETE.md` - What's left
- `FINAL_SUMMARY.md` - Comprehensive summary
- `UI_UX_IMPROVEMENTS.md` - Design details

**Happy Coding!** 🚀
