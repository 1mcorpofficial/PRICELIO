# 🚀 Setup Guide

Complete setup instructions for ReceiptRadar development environment.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Python 3 (for static server)
- Git
- PostgreSQL client (optional, for manual DB access)

## Step 1: Infrastructure Setup

Start the required infrastructure services:

```bash
cd infra

# Copy example env
cp .env.example .env

# Start services
docker compose up -d

# Verify services are running
docker compose ps
```

This starts:
- PostgreSQL (default port 5432; if conflict, set POSTGRES_PORT in infra/.env to 55432 and update service .env files)
- Redis (port 6379)
- RabbitMQ (port 5672, management UI: 15672)
- MinIO (port 9000, console: 9001)

### Initialize Database

```bash
# Connect to PostgreSQL
psql -h localhost -U receiptradar -d receiptradar

# Run schema
\i db/schema.sql

# Run seed data
\i db/seeds/seed.sql

# Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

# Exit
\q
```

## Step 2: Service Setup

### API Service (Port 3000)

```bash
cd services/api

# Install dependencies
npm install

# Create .env
cat > .env << EOF
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432 # if conflict, set to 55432 and update infra/.env
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
JWT_SECRET=CHANGEME_STRONG
AI_GATEWAY_URL=http://localhost:3001
EOF

# Start service
npm run dev
```

### AI Gateway (Port 3001)

```bash
cd services/ai-gateway

# Install dependencies
npm install

# Create .env with your API keys
cat > .env << EOF
PORT=3001
NODE_ENV=development

# Add at least one of these
OPENAI_API_KEY=CHANGEME_STRONG
ANTHROPIC_API_KEY=CHANGEME_STRONG

DEFAULT_PROVIDER=openai
MAX_RETRIES=2
TIMEOUT_MS=30000
EOF

# Start service
npm run dev
```

**Important**: Add real API keys for OpenAI or Anthropic. Without them, only Tesseract fallback will work (lower quality).

### Receipt Worker

```bash
cd services/receipts

# Install dependencies
npm install

# Create .env
cat > .env << EOF
POSTGRES_HOST=localhost
POSTGRES_PORT=5432 # if conflict, set to 55432 and update infra/.env
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
AI_GATEWAY_URL=http://localhost:3001
EOF

# Start worker
npm run dev
```

### Ingest Service (Port 3002)

```bash
cd services/ingest

# Install dependencies
npm install

# Create .env
cat > .env << EOF
PORT=3002
POSTGRES_HOST=localhost
POSTGRES_PORT=5432 # if conflict, set to 55432 and update infra/.env
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
EOF

# Start service
npm run dev
```

### Admin Panel (Port 3003)

```bash
cd apps/admin

# Install dependencies
npm install

# Create .env
cat > .env << EOF
PORT=3003
POSTGRES_HOST=localhost
POSTGRES_PORT=5432 # if conflict, set to 55432 and update infra/.env
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=CHANGEME_STRONG
EOF

# Start service
npm run dev
```

### Analytics Service (Port 3004)

```bash
cd services/analytics

# Install dependencies
npm install

# Create .env
cat > .env << EOF
PORT=3004
POSTGRES_HOST=localhost
POSTGRES_PORT=5432 # if conflict, set to 55432 and update infra/.env
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
EOF

# Start service
npm run dev
```

### PWA Frontend (Port 8000)

```bash
# From project root
python -m http.server 8000

# Or use any static server:
# npx serve -p 8000
# php -S localhost:8000
```

## Step 3: Verify Everything Works

### Check Service Health

```bash
# API
curl http://localhost:3000/health

# AI Gateway
curl http://localhost:3001/health

# Ingest
curl http://localhost:3002/health

# Analytics
curl http://localhost:3004/health
```

### Test Receipt Upload

```bash
# Create a test receipt image (or use a real one)
# Upload via API
curl -X POST http://localhost:3000/receipts/upload \
  -F "file=@/path/to/receipt.jpg"

# Check status
curl http://localhost:3000/receipts/{receipt_id}/status
```

### Test Basket Optimization

```bash
# Create basket
curl -X POST http://localhost:3000/baskets \
  -H "Content-Type: application/json" \
  -d '{"name":"Test basket"}'

# Add items
curl -X POST http://localhost:3000/baskets/{basket_id}/items \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"raw_name": "Greek yogurt"},
      {"raw_name": "Coffee"}
    ]
  }'

# Optimize
curl -X POST http://localhost:3000/baskets/{basket_id}/optimize
```

### Test Admin Panel

1. Open http://localhost:3003
2. Login with the credentials that match `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`
3. Check dashboard stats
4. Review low confidence receipts

## Step 4: Seed Test Data

Create some test data:

```sql
-- Connect to database
psql -h localhost -U receiptradar -d receiptradar

-- Add test city
INSERT INTO cities (name, country_code) 
VALUES ('Vilnius', 'LT') 
ON CONFLICT DO NOTHING;

-- Add test stores
INSERT INTO stores (chain, name, city_id, lat, lon, is_active)
SELECT 
  'Maxima',
  'Maxima X - Naujamiestis',
  (SELECT id FROM cities WHERE name = 'Vilnius'),
  54.676,
  25.267,
  true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE chain = 'Maxima' LIMIT 1);

-- Add test products
INSERT INTO products (name, category_id, is_active)
VALUES 
  ('Greek yogurt 400g', NULL, true),
  ('Arabica coffee 1kg', NULL, true),
  ('Fresh salmon 300g', NULL, true)
ON CONFLICT DO NOTHING;

-- Add test offers
INSERT INTO offers (product_id, source_type, store_id, price_value, valid_from, valid_to, status)
SELECT 
  p.id,
  'flyer',
  s.id,
  1.19,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  'active'
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Greek yogurt 400g'
LIMIT 1;
```

## Common Issues & Solutions

### Issue: Services can't connect to database

**Solution**: Check PostgreSQL is running and credentials are correct:
```bash
docker compose ps
psql -h localhost -U receiptradar -d receiptradar
```

### Issue: Receipt processing hangs

**Solution**: Check RabbitMQ is running and AI Gateway is accessible:
```bash
docker compose ps rabbitmq
curl http://localhost:3001/health
```

### Issue: AI extraction fails

**Solution**: Verify API keys are set:
```bash
cd services/ai-gateway
cat .env | grep API_KEY
```

### Issue: Port already in use

**Solution**: Change port in `.env` file or kill the process:
```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Issue: Database migrations not applied

**Solution**: Manually run schema:
```bash
psql -h localhost -U receiptradar -d receiptradar -f db/schema.sql
```

## Development Workflow

### Making Changes

1. **Backend**: Edit files in `services/*/src/`, services auto-reload
2. **Frontend**: Edit `index.html`, `app.js`, `styles.css`, refresh browser
3. **Database**: Add migrations to `db/migrations/`
4. **Admin**: Edit `apps/admin/`, restart service

### Debugging

```bash
# View logs
docker compose logs -f postgres
docker compose logs -f rabbitmq

# Check queue status
docker compose exec rabbitmq rabbitmqctl list_queues

# Check database
psql -h localhost -U receiptradar -d receiptradar
\dt  # List tables
\d+ receipts  # Describe table
```

### Running Tests

```bash
# API tests (when implemented)
cd services/api
npm test

# Integration tests
cd tests
npm test
```

## Production Deployment

### Environment Variables

Update all `.env` files with production values:
- Strong JWT secrets
- Real API keys
- Production database credentials
- HTTPS URLs
- Rate limits

### Database

```bash
# Backup
pg_dump receiptradar > backup.sql

# Restore
psql receiptradar < backup.sql
```

### Docker Deployment

```bash
# Build images
docker build -t receiptradar-api services/api
docker build -t receiptradar-ai-gateway services/ai-gateway
# ... etc

# Deploy with compose
docker-compose -f docker-compose.prod.yml up -d
```

### Recommended Stack

- **Hosting**: AWS/GCP/DigitalOcean
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Queue**: Managed RabbitMQ (CloudAMQP)
- **Storage**: S3 or equivalent
- **CDN**: CloudFront/CloudFlare
- **Monitoring**: Sentry, Datadog, New Relic
- **Logging**: ELK stack or CloudWatch

---

Need help? Check the READMEs in each service directory for detailed docs.
