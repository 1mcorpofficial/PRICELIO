# Analytics Service

Event tracking and KPI aggregation for ReceiptRadar.

## Features

- **Event Tracking**: Collect and aggregate user events
- **KPI Calculation**: Real-time metrics for receipts, baskets, and offers
- **Queue Consumer**: Process events asynchronously via RabbitMQ
- **Retention Analysis**: Calculate user cohort retention rates
- **Daily Aggregation**: Automated cleanup and aggregation of old data

## Event Types

Common events tracked:
- `receipt_uploaded` - Receipt upload initiated
- `receipt_processed` - Receipt extraction completed
- `basket_created` - Basket created
- `basket_optimized` - Basket optimization run
- `search_performed` - Product search
- `offer_viewed` - Offer detail viewed
- `map_viewed` - Map view opened

## API Endpoints

### `POST /events/track`

Track a user event.

**Request:**
```json
{
  "event_name": "receipt_uploaded",
  "user_id": "uuid",
  "city_id": "uuid",
  "metadata": {
    "store_chain": "Maxima",
    "total": 15.43
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### `GET /kpis`

Get KPIs for date range.

**Query params:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `city_id` - Filter by city (optional)

**Response:**
```json
{
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "receipts": {
    "total": 1247,
    "unique_users": 523,
    "avg_confidence": "0.872",
    "total_value": "18432.50"
  },
  "baskets": {
    "total": 892,
    "avg_items": "4.2"
  },
  "offers": {
    "active": 1543,
    "unique_products": 876,
    "avg_discount": "15.3"
  },
  "events": {
    "receipt_uploaded": 1247,
    "basket_created": 892,
    "search_performed": 3421
  }
}
```

### `GET /events/summary`

Get event summary for last 30 days.

**Response:**
```json
[
  {
    "event_name": "search_performed",
    "total_count": 3421,
    "days_active": 30
  },
  ...
]
```

## Setup

```bash
cd services/analytics
npm install
cp ../.env.example .env
npm run dev
```

## Database Schema

The service uses the `events` table:

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY,
  event_date date NOT NULL,
  event_name text NOT NULL,
  city_id uuid REFERENCES cities(id),
  count integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Integration

### From API Service

```javascript
const axios = require('axios');

async function trackEvent(eventName, userId, metadata) {
  try {
    await axios.post('http://localhost:3004/events/track', {
      event_name: eventName,
      user_id: userId,
      metadata
    });
  } catch (error) {
    console.error('Event tracking failed:', error);
  }
}

// Example usage
await trackEvent('receipt_uploaded', userId, {
  store_chain: 'Maxima',
  total: 15.43
});
```

### Via Queue (Recommended for high volume)

```javascript
const amqp = require('amqplib');

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.assertQueue('analytics_events');

channel.sendToQueue('analytics_events', Buffer.from(JSON.stringify({
  event_name: 'receipt_uploaded',
  user_id: userId,
  metadata: { store_chain: 'Maxima' }
})));
```

## Scheduled Jobs

- **Daily at 1 AM**: Aggregate events and cleanup old data (90+ days)

## Future Enhancements

- Real-time event streaming
- Custom dashboard builder
- Funnel analysis
- A/B test tracking
- Revenue attribution
- Anomaly detection
