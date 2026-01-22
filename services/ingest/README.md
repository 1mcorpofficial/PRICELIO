# Ingest Service

Automated flyer and online price ingestion service with connector framework.

## Features

- **Connector framework**: Pluggable connectors for each store chain
- **Scheduled runs**: Cron-based scheduling for automatic updates
- **Quality validation**: Price bounds, date sanity, item count checks
- **Normalization**: Standardized price, unit, and date formats
- **Manual triggers**: API endpoints to run connectors on demand

## Connectors

### Maxima
- Source: Web scraping from flyer pages
- Schedule: Daily at 6 AM
- Coverage: All Maxima stores in database

### Rimi
- Source: API (planned) or web scraping
- Schedule: Daily at 7 AM
- Coverage: All Rimi stores in database

### Iki
- Source: Web scraping from flyer pages
- Schedule: Daily at 8 AM
- Coverage: All Iki stores in database

## API Endpoints

### `GET /health`
Service health and connector count

### `GET /connectors`
List all connectors with status

### `POST /connectors/:id/run`
Manually trigger a connector run

Example:
```bash
curl -X POST http://localhost:3002/connectors/maxima-lt/run
```

## Setup

```bash
cd services/ingest
npm install
cp ../.env.example .env
npm run dev
```

## Adding New Connectors

1. Create connector file in `src/connectors/[chain].js`
2. Implement required methods:
   - `fetch()` - Download raw data
   - `extract()` - Parse offers from raw data
   - `normalize()` - Standardize format
   - `publish()` - Write to database
   - `run()` - Execute full pipeline
3. Register in `src/scheduler.js`

Example connector structure:

```javascript
async function fetch() {
  // Download flyer/catalog
  return { raw_data, url, fetched_at };
}

async function extract(raw) {
  // Parse HTML/PDF/JSON
  return { offers: [...], count };
}

async function normalize(extracted) {
  // Standardize prices, dates, units
  return normalized_offers;
}

async function publish(offers) {
  // Write to offers table
  return { published, errors };
}

async function run() {
  const raw = await fetch();
  const extracted = await extract(raw);
  const normalized = await normalize(extracted);
  return await publish(normalized);
}
```

## Quality Checks

The normalizer validates:
- Price sanity (positive values, old > current)
- Date ranges (valid_to after valid_from)
- Product names (minimum length)
- Discount percentages (0-100%)

## Future Enhancements

- Image-based flyer parsing with AI
- Price history comparison for anomaly detection
- Diff detection (new/ended/changed offers)
- Admin notifications for quality issues
- Retry logic with exponential backoff
