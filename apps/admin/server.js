require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { getClient } = require('./db');

const app = express();
const port = process.env.PORT || 3003;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const API_SERVICE_URL = process.env.API_SERVICE_URL || 'https://api.pricelio.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const sessions = new Map();
const PLUS_FEATURES = [
  'time_machine',
  'advanced_analytics',
  'multi_baskets',
  'priority_scan',
  'family_plus'
];

async function callApiAdmin(method, endpoint, body = null) {
  const response = await axios({
    method,
    url: `${API_SERVICE_URL}${endpoint}`,
    data: body,
    timeout: 15000,
    headers: ADMIN_API_KEY ? { 'x-admin-key': ADMIN_API_KEY } : undefined
  });
  return response.data;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split('=');
    if (!rawKey) return acc;
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

function createSession(email) {
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { email, expiresAt: Date.now() + SESSION_TTL_MS });
  return sessionId;
}

async function getDbAdminByEmail(email) {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT id, email, password_hash, status
       FROM admin_users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    // admin_users table might not exist yet in older environments.
    if (error && (error.code === '42P01' || /admin_users/.test(error.message))) {
      return null;
    }
    throw error;
  }
}

async function bootstrapAdminFromEnv() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) return;
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO admin_users (email, password_hash, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_EMAIL, ADMIN_PASSWORD_HASH]
    );
  } catch (error) {
    if (error && error.code === '42P01') {
      return;
    }
    console.error('Failed to bootstrap admin user:', error.message);
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'unauthorized' });
  }

  req.admin = { email: session.email };
  next();
}

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  // Primary auth path: DB-backed admin users.
  let authenticatedEmail = null;
  const dbAdmin = await getDbAdminByEmail(email);
  if (dbAdmin && dbAdmin.status === 'active') {
    const ok = await bcrypt.compare(password, dbAdmin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    authenticatedEmail = dbAdmin.email;
  }

  // Fallback auth path: env-based admin credentials.
  if (!authenticatedEmail && ADMIN_EMAIL && ADMIN_PASSWORD_HASH && email === ADMIN_EMAIL) {
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    authenticatedEmail = email;
  }

  if (!authenticatedEmail) {
    if (!ADMIN_EMAIL && !dbAdmin) {
      return res.status(500).json({ error: 'admin_credentials_not_configured' });
    }
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const sessionId = createSession(authenticatedEmail);
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS
  });

  return res.json({ ok: true, email: authenticatedEmail });
});

app.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({ ok: true });
});

// Protect all admin API routes
app.use('/api', requireAuth);

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
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
app.get('/api/receipts/low-confidence', async (req, res) => {
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
app.get('/api/receipts/:id', async (req, res) => {
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
app.post('/api/receipts/:id/items/:itemId/confirm', async (req, res) => {
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
app.get('/api/products/unmatched', async (req, res) => {
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

// Product lookup for manual mapping in review flow
app.get('/api/products/search', async (req, res) => {
  try {
    const client = await getClient();
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    if (!q) {
      return res.json([]);
    }

    const result = await client.query(
      `SELECT id, name, brand
       FROM products
       WHERE name ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [`%${q}%`, limit]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product mapping
app.post('/api/products/create-mapping', async (req, res) => {
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
app.get('/api/connectors/health', async (req, res) => {
  try {
    const rows = await callApiAdmin('GET', '/admin/scrapers/status');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message || 'connector_health_failed' });
  }
});

app.get('/api/system/health', async (req, res) => {
  try {
    const payload = await callApiAdmin('GET', '/admin/system/health');
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message || 'system_health_failed' });
  }
});

app.post('/api/connectors/:id/force-sync', async (req, res) => {
  try {
    const payload = await callApiAdmin('POST', `/admin/scrapers/${encodeURIComponent(req.params.id)}/force-sync`, {});
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit-log', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const payload = await callApiAdmin('GET', `/admin/audit-log?limit=${limit}`);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message || 'admin_audit_log_failed' });
  }
});

// Grant Plus entitlements to a user (admin tool)
app.post('/api/admin/users/:id/grant-plus', async (req, res) => {
  try {
    const client = await getClient();
    const userId = String(req.params.id || '').trim();
    const durationDays = Math.max(1, Math.min(3650, parseInt(req.body?.duration_days, 10) || 365));
    const featureKeys = Array.isArray(req.body?.feature_keys) && req.body.feature_keys.length
      ? req.body.feature_keys
      : PLUS_FEATURES;

    const userCheck = await client.query(
      `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!userCheck.rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const inserted = [];
    for (const feature of featureKeys) {
      const row = await client.query(
        `INSERT INTO user_entitlements (
          user_id, feature_key, source_type, source_id, starts_at, ends_at, is_active, metadata, created_at
         )
         VALUES (
          $1, $2, 'promo', NULL, NOW(), NOW() + ($3 || ' days')::interval, true, $4::jsonb, NOW()
         )
         RETURNING id, feature_key, starts_at, ends_at`,
        [
          userId,
          feature,
          String(durationDays),
          JSON.stringify({
            granted_by_admin: req.admin?.email || null,
            duration_days: durationDays
          })
        ]
      );
      inserted.push(row.rows[0]);
    }

    return res.json({
      success: true,
      user_id: userId,
      email: userCheck.rows[0].email,
      duration_days: durationDays,
      features_granted: inserted
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'grant_plus_failed' });
  }
});

// Serve admin UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Admin panel running on port ${port}`);
  bootstrapAdminFromEnv().catch((error) => {
    console.error('Admin bootstrap failed:', error.message);
  });
});
