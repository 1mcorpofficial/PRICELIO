require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { trackEvent, getKPIs, aggregateDailyEvents } = require('./tracker');
const { connectQueue, consumeEvents } = require('./queue');

const app = express();
const port = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Track event
app.post('/events/track', async (req, res) => {
  try {
    const { event_name, user_id, city_id, metadata } = req.body;
    
    if (!event_name) {
      return res.status(400).json({ error: 'event_name_required' });
    }
    
    await trackEvent({
      event_name,
      user_id: user_id || null,
      city_id: city_id || null,
      metadata: metadata || {}
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Event tracking failed:', error);
    res.status(500).json({ error: 'tracking_failed' });
  }
});

// Get KPIs
app.get('/kpis', async (req, res) => {
  try {
    const { start_date, end_date, city_id } = req.query;
    
    const kpis = await getKPIs({
      startDate: start_date,
      endDate: end_date,
      cityId: city_id
    });
    
    res.json(kpis);
  } catch (error) {
    console.error('KPI fetch failed:', error);
    res.status(500).json({ error: 'kpi_fetch_failed' });
  }
});

// Get event counts
app.get('/events/summary', async (req, res) => {
  try {
    const { getClient } = require('./db');
    const client = await getClient();
    
    const result = await client.query(`
      SELECT 
        event_name,
        SUM(count) as total_count,
        COUNT(DISTINCT event_date) as days_active
      FROM events
      WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY event_name
      ORDER BY total_count DESC
      LIMIT 20
    `);
    
    res.json(result.rows.map(row => ({
      event_name: row.event_name,
      total_count: parseInt(row.total_count),
      days_active: parseInt(row.days_active)
    })));
  } catch (error) {
    res.status(500).json({ error: 'summary_failed' });
  }
});

// Schedule daily aggregation
cron.schedule('0 1 * * *', async () => {
  console.log('Running daily event aggregation...');
  try {
    await aggregateDailyEvents();
    console.log('Daily aggregation completed');
  } catch (error) {
    console.error('Daily aggregation failed:', error);
  }
});

// Start event consumer
async function startEventConsumer() {
  try {
    await connectQueue();
    console.log('Event consumer started');
    await consumeEvents();
  } catch (error) {
    console.error('Failed to start event consumer:', error);
    // Retry after 5 seconds
    setTimeout(startEventConsumer, 5000);
  }
}

app.listen(port, () => {
  console.log(`Analytics service running on port ${port}`);
  startEventConsumer();
});
