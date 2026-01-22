require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getClient } = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-change-in-production';

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// Admin login (mock - use real auth in production)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'admin@receiptradar.app' && password === 'admin123') {
    const token = jwt.sign(
      { email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    return res.json({ token, email });
  }
  
  res.status(401).json({ error: 'invalid_credentials' });
});

// Dashboard stats
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    
    const stats = await Promise.all([
      client.query(`SELECT COUNT(*) as count FROM receipts WHERE created_at >= CURRENT_DATE`),
      client.query(`SELECT COUNT(*) as count FROM receipts WHERE status = 'needs_confirmation'`),
      client.query(`SELECT COUNT(*) as count FROM offers WHERE status = 'active' AND valid_to >= CURRENT_DATE`),
      client.query(`SELECT COUNT(*) as count FROM receipt_items WHERE match_status = 'unmatched'`)
    ]);
    
    res.json({
      receipts_today: parseInt(stats[0].rows[0].count),
      needs_confirmation: parseInt(stats[1].rows[0].count),
      active_offers: parseInt(stats[2].rows[0].count),
      unmatched_items: parseInt(stats[3].rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Low confidence receipts
app.get('/api/receipts/low-confidence', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await client.query(
      `SELECT 
        r.id,
        r.store_chain,
        r.receipt_date,
        r.total,
        r.status,
        r.confidence,
        r.created_at,
        COUNT(ri.id) as item_count
      FROM receipts r
      LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
      WHERE r.confidence < 0.7 OR r.status = 'needs_confirmation'
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows.map(row => ({
      id: row.id,
      store_chain: row.store_chain,
      receipt_date: row.receipt_date,
      total: row.total ? parseFloat(row.total) : null,
      status: row.status,
      confidence: row.confidence ? parseFloat(row.confidence) : null,
      item_count: parseInt(row.item_count),
      created_at: row.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receipt detail with items
app.get('/api/receipts/:id', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    
    const receiptResult = await client.query(
      `SELECT * FROM receipts WHERE id = $1`,
      [req.params.id]
    );
    
    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    
    const itemsResult = await client.query(
      `SELECT 
        ri.*,
        p.name as matched_product_name
      FROM receipt_items ri
      LEFT JOIN products p ON p.id = ri.matched_product_id
      WHERE ri.receipt_id = $1
      ORDER BY ri.line_number`,
      [req.params.id]
    );
    
    res.json({
      receipt: receiptResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm receipt item matching
app.post('/api/receipts/:id/items/:itemId/confirm', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    const { product_id } = req.body;
    
    await client.query(
      `UPDATE receipt_items 
       SET matched_product_id = $1, match_status = 'matched', match_confidence = 1.0
       WHERE id = $2`,
      [product_id, req.params.itemId]
    );
    
    // Update receipt status if all items are now matched
    const remaining = await client.query(
      `SELECT COUNT(*) as count 
       FROM receipt_items 
       WHERE receipt_id = $1 AND match_status != 'matched'`,
      [req.params.id]
    );
    
    if (parseInt(remaining.rows[0].count) === 0) {
      await client.query(
        `UPDATE receipts SET status = 'finalized' WHERE id = $1`,
        [req.params.id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unmatched products
app.get('/api/products/unmatched', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await client.query(
      `SELECT 
        raw_name,
        COUNT(*) as occurrence_count,
        AVG(confidence) as avg_confidence
      FROM receipt_items
      WHERE match_status = 'unmatched'
      GROUP BY raw_name
      ORDER BY occurrence_count DESC
      LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows.map(row => ({
      raw_name: row.raw_name,
      occurrence_count: parseInt(row.occurrence_count),
      avg_confidence: row.avg_confidence ? parseFloat(row.avg_confidence) : null
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product mapping
app.post('/api/products/create-mapping', authMiddleware, async (req, res) => {
  try {
    const client = await getClient();
    const { raw_name, product_id } = req.body;
    
    // Create alias
    await client.query(
      `INSERT INTO product_aliases (raw_name, product_id, source_type, confidence)
       VALUES ($1, $2, 'manual', 1.0)
       ON CONFLICT DO NOTHING`,
      [raw_name, product_id]
    );
    
    // Update existing unmatched items
    await client.query(
      `UPDATE receipt_items
       SET matched_product_id = $2, match_status = 'matched', match_confidence = 1.0
       WHERE raw_name = $1 AND match_status = 'unmatched'`,
      [raw_name, product_id]
    );
    
    res.json({ success: true, updated: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connector health
app.get('/api/connectors/health', authMiddleware, async (req, res) => {
  try {
    // Mock connector health - would call ingest service in production
    res.json([
      { name: 'Maxima', status: 'healthy', last_run: new Date().toISOString(), offers_count: 245 },
      { name: 'Rimi', status: 'healthy', last_run: new Date().toISOString(), offers_count: 189 },
      { name: 'Iki', status: 'warning', last_run: new Date(Date.now() - 86400000).toISOString(), offers_count: 156 }
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve admin UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Admin panel running on port ${port}`);
  console.log(`Demo login: admin@receiptradar.app / admin123`);
});
