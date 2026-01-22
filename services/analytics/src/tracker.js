const { getClient } = require('./db');

// Track event (increment daily counter)
async function trackEvent(event) {
  const client = await getClient();
  const eventDate = new Date().toISOString().split('T')[0];
  
  try {
    await client.query(`
      INSERT INTO events (event_date, event_name, city_id, count, metadata)
      VALUES ($1, $2, $3, 1, $4)
      ON CONFLICT (event_date, event_name, COALESCE(city_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET 
        count = events.count + 1,
        metadata = EXCLUDED.metadata
    `, [
      eventDate,
      event.event_name,
      event.city_id,
      JSON.stringify(event.metadata || {})
    ]);
    
    return true;
  } catch (error) {
    console.error('Track event error:', error);
    return false;
  }
}

// Get KPIs for date range
async function getKPIs(options = {}) {
  const client = await getClient();
  const { startDate, endDate, cityId } = options;
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];
  
  try {
    // Receipt stats
    const receiptStats = await client.query(`
      SELECT 
        COUNT(*) as total_receipts,
        COUNT(DISTINCT COALESCE(user_id, guest_session_id)) as unique_users,
        AVG(confidence) as avg_confidence,
        SUM(total) as total_value
      FROM receipts
      WHERE receipt_date >= $1 AND receipt_date <= $2
        ${cityId ? 'AND store_id IN (SELECT id FROM stores WHERE city_id = $3)' : ''}
    `, cityId ? [start, end, cityId] : [start, end]);
    
    // Basket stats
    const basketStats = await client.query(`
      SELECT 
        COUNT(*) as total_baskets,
        AVG(item_count) as avg_items_per_basket
      FROM (
        SELECT basket_id, COUNT(*) as item_count
        FROM basket_items
        WHERE basket_id IN (
          SELECT id FROM baskets WHERE created_at >= $1 AND created_at <= $2
        )
        GROUP BY basket_id
      ) subq
    `, [start, end]);
    
    // Offer stats
    const offerStats = await client.query(`
      SELECT 
        COUNT(*) as active_offers,
        COUNT(DISTINCT product_id) as unique_products,
        AVG(discount_percent) as avg_discount
      FROM offers
      WHERE status = 'active' 
        AND valid_to >= CURRENT_DATE
        ${cityId ? 'AND city_id = $1' : ''}
    `, cityId ? [cityId] : []);
    
    // Event stats
    const eventStats = await client.query(`
      SELECT 
        event_name,
        SUM(count) as total
      FROM events
      WHERE event_date >= $1 AND event_date <= $2
        ${cityId ? 'AND city_id = $3' : ''}
      GROUP BY event_name
    `, cityId ? [start, end, cityId] : [start, end]);
    
    const receipts = receiptStats.rows[0];
    const baskets = basketStats.rows[0];
    const offers = offerStats.rows[0];
    
    const eventMap = {};
    eventStats.rows.forEach(row => {
      eventMap[row.event_name] = parseInt(row.total);
    });
    
    return {
      period: { start, end },
      receipts: {
        total: parseInt(receipts.total_receipts || 0),
        unique_users: parseInt(receipts.unique_users || 0),
        avg_confidence: receipts.avg_confidence ? parseFloat(receipts.avg_confidence).toFixed(3) : null,
        total_value: receipts.total_value ? parseFloat(receipts.total_value).toFixed(2) : null
      },
      baskets: {
        total: parseInt(baskets.total_baskets || 0),
        avg_items: baskets.avg_items_per_basket ? parseFloat(baskets.avg_items_per_basket).toFixed(1) : null
      },
      offers: {
        active: parseInt(offers.active_offers || 0),
        unique_products: parseInt(offers.unique_products || 0),
        avg_discount: offers.avg_discount ? parseFloat(offers.avg_discount).toFixed(1) : null
      },
      events: eventMap
    };
  } catch (error) {
    console.error('Get KPIs error:', error);
    throw error;
  }
}

// Aggregate daily events (cleanup old data)
async function aggregateDailyEvents() {
  const client = await getClient();
  
  try {
    // Delete events older than 90 days
    const result = await client.query(`
      DELETE FROM events 
      WHERE event_date < CURRENT_DATE - INTERVAL '90 days'
    `);
    
    console.log(`Deleted ${result.rowCount} old event records`);
    return result.rowCount;
  } catch (error) {
    console.error('Aggregate events error:', error);
    throw error;
  }
}

// Calculate user retention
async function calculateRetention(startDate, endDate) {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      WITH cohort AS (
        SELECT DISTINCT 
          COALESCE(user_id, guest_session_id) as user_id,
          DATE_TRUNC('week', MIN(created_at)) as cohort_week
        FROM receipts
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY COALESCE(user_id, guest_session_id)
      ),
      activity AS (
        SELECT DISTINCT
          COALESCE(user_id, guest_session_id) as user_id,
          DATE_TRUNC('week', created_at) as activity_week
        FROM receipts
        WHERE created_at >= $1 AND created_at <= $2
      )
      SELECT 
        cohort.cohort_week,
        COUNT(DISTINCT cohort.user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN activity.activity_week > cohort.cohort_week 
          THEN cohort.user_id END) as retained_users
      FROM cohort
      LEFT JOIN activity ON cohort.user_id = activity.user_id
      GROUP BY cohort.cohort_week
      ORDER BY cohort.cohort_week DESC
    `, [startDate, endDate]);
    
    return result.rows.map(row => ({
      cohort_week: row.cohort_week,
      cohort_size: parseInt(row.cohort_size),
      retained_users: parseInt(row.retained_users),
      retention_rate: row.cohort_size > 0 
        ? ((row.retained_users / row.cohort_size) * 100).toFixed(1) + '%'
        : '0%'
    }));
  } catch (error) {
    console.error('Calculate retention error:', error);
    throw error;
  }
}

module.exports = {
  trackEvent,
  getKPIs,
  aggregateDailyEvents,
  calculateRetention
};
