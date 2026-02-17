# Environment Variables Templates

Since `.env.example` files are gitignored, here are the templates for all services.

## 📁 services/api/.env

```bash
# API Service Configuration
PORT=3000
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG

# Queue
RABBITMQ_URL=amqp://localhost

# Authentication
JWT_SECRET=CHANGEME_STRONG

# External Services
AI_GATEWAY_URL=http://localhost:3001

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## 📁 services/ai-gateway/.env

```bash
# AI Gateway Configuration
PORT=3001
NODE_ENV=development

# AI Providers (add at least one!)
OPENAI_API_KEY=CHANGEME_STRONG
ANTHROPIC_API_KEY=CHANGEME_STRONG

# Provider Settings
DEFAULT_PROVIDER=openai
MAX_RETRIES=2
TIMEOUT_MS=30000

# Rate Limits
MAX_REQUESTS_PER_MINUTE=20
MAX_REQUESTS_PER_HOUR=200
```

## 📁 services/receipts/.env

```bash
# Receipt Processing Worker
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG

# Queue
RABBITMQ_URL=amqp://localhost
QUEUE_NAME=receipt_processing

# External Services
AI_GATEWAY_URL=http://localhost:3001

# Processing
MAX_RETRIES=3
CONCURRENCY=1
```

## 📁 services/ingest/.env

```bash
# Ingest Service
PORT=3002
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG

# Connector Settings
USER_AGENT=Mozilla/5.0 (compatible; ReceiptRadar/1.0)
REQUEST_TIMEOUT_MS=15000
```

## 📁 services/analytics/.env

```bash
# Analytics Service
PORT=3004
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG

# Queue
RABBITMQ_URL=amqp://localhost
ANALYTICS_QUEUE=analytics_events

# Settings
EVENT_RETENTION_DAYS=90
```

## 📁 apps/admin/.env

```bash
# Admin Panel
PORT=3003
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG

# Admin Auth (bcrypt hash)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=CHANGEME_STRONG
```

## 📁 infra/.env

```bash
# Infrastructure
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
POSTGRES_DB=receiptradar
POSTGRES_PORT=5432

REDIS_PORT=6379

RABBITMQ_DEFAULT_USER=receiptradar
RABBITMQ_DEFAULT_PASS=CHANGEME_STRONG
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672

MINIO_ROOT_USER=receiptradar
MINIO_ROOT_PASSWORD=CHANGEME_STRONG
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
```

## 🚀 Quick Setup Script

Create all `.env` files at once:

```bash
# Run from project root

# services/api/.env
cat > services/api/.env << 'EOF'
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
JWT_SECRET=CHANGEME_STRONG
AI_GATEWAY_URL=http://localhost:3001
EOF

# services/ai-gateway/.env
cat > services/ai-gateway/.env << 'EOF'
PORT=3001
OPENAI_API_KEY=CHANGEME_STRONG
DEFAULT_PROVIDER=openai
EOF

# services/receipts/.env
cat > services/receipts/.env << 'EOF'
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
AI_GATEWAY_URL=http://localhost:3001
EOF

# services/ingest/.env
cat > services/ingest/.env << 'EOF'
PORT=3002
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
EOF

# services/analytics/.env
cat > services/analytics/.env << 'EOF'
PORT=3004
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
RABBITMQ_URL=amqp://localhost
EOF

# apps/admin/.env
cat > apps/admin/.env << 'EOF'
PORT=3003
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=receiptradar
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
JWT_SECRET=CHANGEME_STRONG
EOF

# infra/.env
cat > infra/.env << 'EOF'
POSTGRES_USER=receiptradar
POSTGRES_PASSWORD=CHANGEME_STRONG
POSTGRES_DB=receiptradar
RABBITMQ_DEFAULT_USER=receiptradar
RABBITMQ_DEFAULT_PASS=CHANGEME_STRONG
MINIO_ROOT_USER=receiptradar
MINIO_ROOT_PASSWORD=CHANGEME_STRONG
EOF

echo "✅ All .env files created!"
echo "⚠️  IMPORTANT: Edit services/ai-gateway/.env and add your OPENAI_API_KEY!"
```

## ⚠️ CRITICAL: Add Your API Keys!

After running the setup script, you MUST edit:

```bash
nano services/ai-gateway/.env
```

And add your real API key:
```bash
OPENAI_API_KEY=CHANGEME_STRONG
# OR
ANTHROPIC_API_KEY=CHANGEME_STRONG
```

Without this, receipt processing will only use Tesseract (lower quality).
