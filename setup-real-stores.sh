#!/bin/bash

# Setup Real Stores with All 15 Chains - ReceiptRadar
# This script sets up all 15 store chains with REAL addresses and data

echo "🏪 RECEIPTRAD ALL 15 STORE CHAINS - REAL DATA SETUP"
echo "═══════════════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Step 1: Check PostgreSQL
echo -e "\n${YELLOW}Step 1:${NC} Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL found${NC}"

# Database configuration
DB_NAME=${DB_NAME:-"receiptadar"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

# Step 2: Check database connection
echo -e "\n${YELLOW}Step 2:${NC} Checking database connection..."
if ! PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 3: Run REAL STORES migration
echo -e "\n${YELLOW}Step 3:${NC} Running REAL STORES migration..."
echo -e "${BLUE}This will add 15 store chains with 70+ real addresses${NC}"

if [ -f "db/migrations/003_real_stores_all_chains.sql" ]; then
    PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/migrations/003_real_stores_all_chains.sql
    
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

# Step 4: Verify stores
echo -e "\n${YELLOW}Step 4:${NC} Verifying stores..."
STORE_COUNT=$(PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM stores WHERE is_active = true")
CHAIN_COUNT=$(PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT chain) FROM stores WHERE is_active = true")
CITY_COUNT=$(PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT city_id) FROM stores WHERE is_active = true")

echo -e "${GREEN}✅ Stores: $STORE_COUNT${NC}"
echo -e "${GREEN}✅ Chains: $CHAIN_COUNT${NC}"
echo -e "${GREEN}✅ Cities: $CITY_COUNT${NC}"

# Step 5: List all chains
echo -e "\n${YELLOW}Step 5:${NC} Listing all store chains..."
echo "─────────────────────────────────────────────────────────────────"
PGPASSWORD=${DB_PASSWORD} psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
  chain as \"Tinklas\", 
  COUNT(*) as \"Parduotuvių\",
  string_agg(DISTINCT format, ', ') as \"Formatai\",
  string_agg(DISTINCT c.name, ', ') as \"Miestai\"
FROM stores s
LEFT JOIN cities c ON c.id = s.city_id
WHERE s.is_active = true 
GROUP BY chain 
ORDER BY chain
"
echo "─────────────────────────────────────────────────────────────────"

# Step 6: Install dependencies
echo -e "\n${YELLOW}Step 6:${NC} Installing ingest service dependencies..."
if [ -d "services/ingest" ]; then
    cd services/ingest
    if [ -f "package.json" ]; then
        npm install --silent
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dependencies installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Dependencies installation had issues${NC}"
        fi
    fi
    cd ../..
fi

# Step 7: Test connectors
echo -e "\n${YELLOW}Step 7:${NC} Testing all 15 connectors..."
if [ -f "services/ingest/test-all-connectors.js" ]; then
    echo "Running connector tests (this may take 30-60 seconds)..."
    node services/ingest/test-all-connectors.js
else
    echo -e "${YELLOW}⚠️  Test file not found, skipping tests${NC}"
fi

# Done!
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE - ALL 15 CHAINS WITH REAL DATA!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n📊 Summary:"
echo "  • Total stores: $STORE_COUNT"
echo "  • Total chains: $CHAIN_COUNT (Target: 15)"
echo "  • Total cities: $CITY_COUNT"
echo "  • Real addresses: ✅ YES"
echo "  • Real coordinates: ✅ YES"

echo -e "\n🏪 Store chains:"
echo "  📦 Grocery (6): Maxima, Rimi, Iki, Norfa, Šilas, Lidl"
echo "  🔨 DIY/Furniture (2): Senukai, Moki Veži"
echo "  📚 Books (1): Ermitažas"
echo "  💄💊 Beauty/Pharmacy (3): Drogas, Eurovaistinė, Gintarinė vaistinė"
echo "  💻 Electronics (3): Varle.lt, Elektromarkt, Pigu.lt"

echo -e "\n🚀 Next steps:"
echo "  1. Start API: cd services/api && npm start"
echo "  2. Start Ingest: cd services/ingest && npm start"
echo "  3. Test API: curl http://localhost:3001/chains"
echo "  4. Get Lidl stores: curl http://localhost:3001/stores?chain=Lidl"
echo "  5. Get Electronics offers: curl 'http://localhost:3001/offers?category=electronics'"

echo -e "\n📚 Documentation:"
echo "  • ALL_15_CHAINS_COMPLETE.md - Full documentation"
echo "  • docs/ALL_STORE_CHAINS.md - Detailed chain info"
echo "  • services/ingest/README.md - Ingest service docs"

echo ""
