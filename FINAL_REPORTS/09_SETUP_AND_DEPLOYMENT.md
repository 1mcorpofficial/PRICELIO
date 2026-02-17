# 🚀 SETUP IR DEPLOYMENT

**Failas:** 09_SETUP_AND_DEPLOYMENT.md  
**Kategorija:** Setup & Deployment  
**Versija:** 6.0 Final  
**Data:** 2026-01-22

---

## 🎯 SETUP OVERVIEW

ReceiptRadar projektas naudoja **Docker Compose** visiems servisams ir duomenų bazėms. Full setup užtrunka **~10 minutes** ir reikalauja tik **Docker** bei **Node.js**.

---

## 📋 PREREQUISITES

### Required:
- **Docker** 24+ & Docker Compose 2.0+
- **Node.js** 18 LTS
- **npm** 9+
- **Git**
- **PostgreSQL** client tools (optional, for migrations)
- **OpenAI API Key** (for AI features)

### System Requirements:
- **CPU:** 4+ cores
- **RAM:** 8GB+ (16GB recommended)
- **Disk:** 20GB+ free space
- **OS:** Linux, macOS, or Windows (WSL2)

### Check Prerequisites:
```bash
# Docker
docker --version
# Docker version 24.0.0 or higher

# Docker Compose
docker-compose --version
# Docker Compose version 2.0.0 or higher

# Node.js
node --version
# v18.0.0 or higher

# npm
npm --version
# 9.0.0 or higher
```

---

## 🔧 INSTALLATION STEPS

### Step 1: Clone Repository
```bash
cd ~/projektai
git clone <repository-url> Pricelio
cd Pricelio
```

---

### Step 2: Setup Environment Variables

#### 2.1 Create All .env Files:
```bash
# Infra
cp infra/.env.example infra/.env

# API Service
cp services/api/.env.example services/api/.env

# Receipt Service
cp services/receipts/.env.example services/receipts/.env

# AI Gateway
cp services/ai-gateway/.env.example services/ai-gateway/.env

# Ingest Service
cp services/ingest/.env.example services/ingest/.env

# Analytics Service
cp services/analytics/.env.example services/analytics/.env

# Admin Panel
cp apps/admin/.env.example apps/admin/.env
```

#### 2.2 Configure OpenAI API Key:
```bash
# Edit services/ai-gateway/.env
OPENAI_API_KEY=CHANGEME_STRONG
```

#### 2.3 All .env Files Content:

**infra/.env:**
```bash
# PostgreSQL
POSTGRES_USER=pricelio
POSTGRES_PASSWORD=CHANGEME_STRONG
POSTGRES_DB=pricelio

# Redis
REDIS_PASSWORD=CHANGEME_STRONG

# RabbitMQ
RABBITMQ_USER=pricelio
RABBITMQ_PASSWORD=CHANGEME_STRONG

# MinIO
MINIO_ROOT_USER=pricelio
MINIO_ROOT_PASSWORD=CHANGEME_STRONG
```

**services/api/.env:**
```bash
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://pricelio:pricelio123@localhost:5432/pricelio

# Redis
REDIS_URL=redis://:CHANGEME_STRONG@localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://pricelio:CHANGEME_STRONG@localhost:5672

# JWT
JWT_SECRET=CHANGEME_STRONG

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# CORS
CORS_ORIGIN=http://localhost:8080
```

**services/ai-gateway/.env:**
```bash
PORT=4002
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=CHANGEME_STRONG

# Anthropic (optional)
ANTHROPIC_API_KEY=

# Tesseract
TESSERACT_PATH=/usr/bin/tesseract
```

**services/receipts/.env:**
```bash
PORT=4001
NODE_ENV=development

DATABASE_URL=postgresql://pricelio:pricelio123@localhost:5432/pricelio
RABBITMQ_URL=amqp://pricelio:CHANGEME_STRONG@localhost:5672
AI_GATEWAY_URL=http://localhost:4002
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=pricelio
MINIO_SECRET_KEY=CHANGEME_STRONG
```

**services/ingest/.env:**
```bash
PORT=4003
NODE_ENV=development

DATABASE_URL=postgresql://pricelio:pricelio123@localhost:5432/pricelio
AI_GATEWAY_URL=http://localhost:4002
REDIS_URL=redis://:CHANGEME_STRONG@localhost:6379
```

**services/analytics/.env:**
```bash
PORT=4004
NODE_ENV=development

DATABASE_URL=postgresql://pricelio:pricelio123@localhost:5432/pricelio
RABBITMQ_URL=amqp://pricelio:CHANGEME_STRONG@localhost:5672
```

**apps/admin/.env:**
```bash
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://pricelio:pricelio123@localhost:5432/pricelio
API_URL=http://localhost:4000
```

---

### Step 3: Start Infrastructure Services
```bash
cd infra
docker-compose up -d

# Wait for services to be ready (~30 seconds)
docker-compose ps

# Expected output:
# NAME                COMMAND                  STATUS              PORTS
# postgres            "docker-entrypoint..."   Up                  0.0.0.0:5432->5432/tcp
# redis               "docker-entrypoint..."   Up                  0.0.0.0:6379->6379/tcp
# rabbitmq            "docker-entrypoint..."   Up                  0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# minio               "/usr/bin/docker-ent…"   Up                  0.0.0.0:9000-9001->9000-9001/tcp
```

**Verify Services:**
```bash
# PostgreSQL
psql -h localhost -U pricelio -d pricelio -c "SELECT version();"

# Redis
redis-cli -a CHANGEME_STRONG ping
# PONG

# RabbitMQ Management UI
open http://localhost:15672
# Login: pricelio / CHANGEME_STRONG

# MinIO Console
open http://localhost:9001
# Login: pricelio / CHANGEME_STRONG
```

---

### Step 4: Initialize Database
```bash
# Run schema
psql -h localhost -U pricelio -d pricelio < db/schema.sql

# Run migrations
psql -h localhost -U pricelio -d pricelio < db/migrations/002_add_new_store_chains.sql
psql -h localhost -U pricelio -d pricelio < db/migrations/003_real_stores_all_chains.sql
psql -h localhost -U pricelio -d pricelio < db/migrations/004_complete_all_chains.sql
psql -h localhost -U pricelio -d pricelio < db/migrations/005_alerts_and_features.sql

# Verify tables
psql -h localhost -U pricelio -d pricelio -c "\dt"

# Expected: 30+ tables
```

**Or use automated script:**
```bash
chmod +x setup-complete-system.sh
./setup-complete-system.sh
```

---

### Step 5: Install Dependencies
```bash
# API Service
cd services/api
npm install

# AI Gateway
cd ../ai-gateway
npm install

# Receipt Service
cd ../receipts
npm install

# Ingest Service
cd ../ingest
npm install

# Analytics Service
cd ../analytics
npm install

# Admin Panel
cd ../../apps/admin
npm install

# Back to root
cd ../../
```

---

### Step 6: Start Backend Services

**Option A: Individual terminals** (recommended for development)
```bash
# Terminal 1: API Service
cd services/api
npm start
# ✅ API Service running on port 4000

# Terminal 2: AI Gateway
cd services/ai-gateway
npm start
# ✅ AI Gateway running on port 4002

# Terminal 3: Receipt Service
cd services/receipts
npm start
# ✅ Receipt Service running on port 4001

# Terminal 4: Ingest Service
cd services/ingest
npm start
# ✅ Ingest Service running on port 4003

# Terminal 5: Analytics Service
cd services/analytics
npm start
# ✅ Analytics Service running on port 4004

# Terminal 6: Admin Panel
cd apps/admin
npm start
# ✅ Admin Panel running on port 3000
```

**Option B: PM2** (recommended for production)
```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './services/api',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'ai-gateway',
      cwd: './services/ai-gateway',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'receipts',
      cwd: './services/receipts',
      script: 'src/worker.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'ingest',
      cwd: './services/ingest',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'analytics',
      cwd: './services/analytics',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'admin',
      cwd: './apps/admin',
      script: 'server.js',
      env: { NODE_ENV: 'production' }
    }
  ]
};
```

---

### Step 7: Start Frontend (PWA)
```bash
# Option A: Python SimpleHTTPServer
cd apps/pwa
python3 -m http.server 8080

# Option B: Node.js http-server
npm install -g http-server
cd apps/pwa
http-server -p 8080

# Option C: Nginx (production)
# See deployment section below

# Open browser
open http://localhost:8080
```

---

### Step 8: Verify Everything Works

**Health Checks:**
```bash
# API Service
curl http://localhost:4000/health
# {"status":"ok","timestamp":"2026-01-22T10:00:00Z"}

# AI Gateway
curl http://localhost:4002/health
# {"status":"ok","provider":"openai"}

# Receipt Service
curl http://localhost:4001/health
# {"status":"ok","queue":"connected"}

# Admin Panel
open http://localhost:3000
# Should load UI

# PWA
open http://localhost:8080
# Should load home page with map
```

**Test Key Features:**
```bash
# 1. Search Products
curl "http://localhost:4000/api/search?q=pienas&city=Vilnius"

# 2. List Stores
curl "http://localhost:4000/api/stores?city=Vilnius"

# 3. Register User
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"CHANGEME_STRONG","firstName":"Test","cityId":1}'

# 4. Test AI Gateway
curl -X POST http://localhost:4002/ai/assistant \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the best price for milk?"}'
```

---

## 🧪 TESTING

### Unit Tests:
```bash
# API Service
cd services/api
npm test

# AI Gateway
cd services/ai-gateway
npm test

# Receipt Service
cd services/receipts
npm test
```

### Integration Tests:
```bash
# Test all connectors
cd services/ingest
node test-all-connectors.js

# Test AI helper functions
cd services/ai-gateway
node test-ai-helper.js
```

### End-to-End Tests:
```bash
# Run E2E test suite
npm run test:e2e
```

---

## 📊 MONITORING

### Logs:
```bash
# API Service logs
tail -f services/api/logs/app.log

# All services (PM2)
pm2 logs

# Docker infrastructure
docker-compose logs -f
```

### Metrics:
```bash
# RabbitMQ Management
open http://localhost:15672

# MinIO Console
open http://localhost:9001

# PostgreSQL Stats
psql -h localhost -U pricelio -d pricelio -c "
  SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
  FROM pg_stat_user_tables
  ORDER BY n_tup_ins DESC;
"
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Option 1: VPS (DigitalOcean, AWS EC2, etc.)

#### 1.1 Server Setup:
```bash
# Create Ubuntu 22.04 VPS (min 4GB RAM)

# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2
```

#### 1.2 Clone & Setup:
```bash
cd /var/www
git clone <repository-url> pricelio
cd pricelio

# Copy production env files
# (Use secure passwords!)

# Start infrastructure
cd infra
docker-compose up -d

# Initialize database
psql -h localhost -U pricelio -d pricelio < ../db/schema.sql
# ... (all migrations)

# Install dependencies
cd ../services/api && npm install --production
cd ../ai-gateway && npm install --production
# ... (all services)

# Start with PM2
cd /var/www/pricelio
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 1.3 Nginx Configuration:
```nginx
# /etc/nginx/sites-available/pricelio
server {
    listen 80;
    server_name pricelio.lt www.pricelio.lt;

    # PWA Frontend
    location / {
        root /var/www/pricelio/apps/pwa;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Panel
    location /admin/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # SSL (certbot)
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/pricelio.lt/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/pricelio.lt/privkey.pem;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/pricelio /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Install SSL (Let's Encrypt)
apt install certbot python3-certbot-nginx -y
certbot --nginx -d pricelio.lt -d www.pricelio.lt
```

---

### Option 2: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml pricelio

# View services
docker service ls

# Scale services
docker service scale pricelio_api=3
```

---

### Option 3: Kubernetes

```bash
# Create cluster (e.g., DigitalOcean Kubernetes)

# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/ai-gateway.yaml
kubectl apply -f k8s/receipts.yaml
kubectl apply -f k8s/ingest.yaml
kubectl apply -f k8s/analytics.yaml
kubectl apply -f k8s/admin.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n pricelio
```

---

## 🔐 SECURITY CHECKLIST

### Production Security:
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ chars)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure firewall (ufw/iptables)
- [ ] Set NODE_ENV=production
- [ ] Disable debug logs
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables (never commit .env)
- [ ] Regular database backups
- [ ] Update dependencies regularly
- [ ] Monitor for vulnerabilities (npm audit)

---

## 📦 BACKUP & RESTORE

### Database Backup:
```bash
# Manual backup
pg_dump -h localhost -U pricelio pricelio > backup_$(date +%Y%m%d).sql

# Automated daily backup (cron)
0 2 * * * pg_dump -h localhost -U pricelio pricelio > /backups/pricelio_$(date +\%Y\%m\%d).sql
```

### Database Restore:
```bash
# Restore from backup
psql -h localhost -U pricelio -d pricelio < backup_20260122.sql
```

### Full System Backup:
```bash
# Backup all data
tar -czf pricelio_full_backup_$(date +%Y%m%d).tar.gz \
  /var/www/pricelio \
  /var/lib/postgresql/data \
  /var/lib/redis \
  /var/lib/minio

# Restore
tar -xzf pricelio_full_backup_20260122.tar.gz -C /
```

---

## 🔄 UPDATE & MAINTENANCE

### Update Code:
```bash
cd /var/www/pricelio
git pull origin main
npm install --production
pm2 restart all
```

### Update Dependencies:
```bash
cd services/api
npm update
npm audit fix

# Repeat for all services
```

### Database Migration:
```bash
# Run new migration
psql -h localhost -U pricelio -d pricelio < db/migrations/006_new_feature.sql
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] SSL certificate ready
- [ ] Database backed up
- [ ] Monitoring setup

### Deployment:
- [ ] Code deployed
- [ ] Dependencies installed
- [ ] Database migrated
- [ ] Services restarted
- [ ] Health checks passing

### Post-Deployment:
- [ ] Verify main features working
- [ ] Check logs for errors
- [ ] Monitor performance
- [ ] Test critical paths
- [ ] Announce to users

---

**Šis failas yra 9/10 galutinių projektų aprašymų.**  
**Kitas failas:** 10_DOCUMENTATION_AND_TESTING.md
