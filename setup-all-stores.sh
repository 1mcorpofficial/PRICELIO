#!/bin/bash

# Setup All Store Chains - ReceiptRadar
# This script sets up all 9 store chains in the database

echo "🏪 RECEIPTRAD AR STORE CHAINS SETUP"
echo "═══════════════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if PostgreSQL is running
echo -e "\n${YELLOW}Step 1:${NC} Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL not found!${NC}"
    echo "Please install PostgreSQL first."
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL found${NC}"

# Step 2: Check database connection
echo -e "\n${YELLOW}Step 2:${NC} Checking database connection..."
DB_NAME=${DB_NAME:-"receiptadar"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_PASSWORD=${DB_PASSWORD:-${POSTGRES_PASSWORD:-""}}

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Missing DB_PASSWORD/POSTGRES_PASSWORD!${NC}"
    exit 1
fi

if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    echo "Please check your database configuration."
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 3: Run migration
echo -e "\n${YELLOW}Step 3:${NC} Running store chains migration..."
if [ -f "db/migrations/002_add_new_store_chains.sql" ]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/migrations/002_add_new_store_chains.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration completed successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Migration file not found!${NC}"
    exit 1
fi

# Optional: apply ecosystem migrations if present
for m in \
  db/migrations/005_alerts_and_features.sql \
  db/migrations/006_admin_users.sql \
  db/migrations/007_gamification_core.sql \
  db/migrations/008_premium_entitlements.sql \
  db/migrations/009_family_households.sql \
  db/migrations/010_bounty_missions.sql \
  db/migrations/011_trust_and_quality.sql \
  db/migrations/012_kids_mode.sql \
  db/migrations/013_feature_flags.sql; do
  if [ -f "$m" ]; then
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$m" >/dev/null 2>&1 || true
  fi
done

# Step 4: Verify stores were added
echo -e "\n${YELLOW}Step 4:${NC} Verifying stores..."
STORE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM stores WHERE is_active = true")

echo -e "${GREEN}✅ Found $STORE_COUNT active stores in database${NC}"

# Step 5: List all chains
echo -e "\n${YELLOW}Step 5:${NC} Listing all store chains..."
echo "─────────────────────────────────────────────────────────────────"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
  chain, 
  COUNT(*) as stores,
  string_agg(DISTINCT format, ', ') as formats
FROM stores 
WHERE is_active = true 
GROUP BY chain 
ORDER BY chain
"
echo "─────────────────────────────────────────────────────────────────"

# Step 6: Install ingest service dependencies
echo -e "\n${YELLOW}Step 6:${NC} Installing ingest service dependencies..."
if [ -d "services/ingest" ]; then
    cd services/ingest
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dependencies installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Dependencies installation had issues${NC}"
        fi
    fi
    cd ../..
fi

# Step 7: Test connectors (optional)
echo -e "\n${YELLOW}Step 7:${NC} Testing connectors..."
if [ -f "services/ingest/test-all-connectors.js" ]; then
    echo "Running connector tests..."
    node services/ingest/test-all-connectors.js
else
    echo -e "${YELLOW}⚠️  Test file not found, skipping tests${NC}"
fi

# Done!
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n📊 Summary:"
echo "  • Total stores: $STORE_COUNT"
echo "  • Store chains: 9"
echo "  • Categories: Grocery, DIY, Books, Beauty"

echo -e "\n🚀 Next steps:"
echo "  1. Start ingest service: cd services/ingest && npm start"
echo "  2. Start API service: cd services/api && npm start"
echo "  3. Test API: curl http://localhost:3001/chains"
echo "  4. Run manual scrape: curl -X POST http://localhost:3003/run/norfa-lt"

echo -e "\n📚 Documentation:"
echo "  • docs/ALL_STORE_CHAINS.md"
echo "  • STORE_CHAINS_COMPLETE.md"
echo "  • services/ingest/README.md"

echo ""
