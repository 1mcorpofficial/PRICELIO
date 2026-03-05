require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const sse = require('./sse');
const alerts = require('./alerts');
const { normalizeLatencyPath, trackEndpointLatency } = require('./helpers/latency');

// Routes
const registerHealth = require('./routes/health');
const registerEvents = require('./routes/events');
const registerDemo = require('./routes/demo');
const registerAuth = require('./routes/auth');
const registerUser = require('./routes/user');
const registerGamification = require('./routes/gamification');
const registerStores = require('./routes/stores');
const registerProducts = require('./routes/products');
const registerBaskets = require('./routes/baskets');
const registerFamilies = require('./routes/families');
const registerReceipts = require('./routes/receipts');
const registerAlerts = require('./routes/alerts');
const registerMisc = require('./routes/misc');
const registerMissions = require('./routes/missions');
const registerAdmin = require('./routes/admin');
const registerInternal = require('./routes/internal');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const port = process.env.PORT || 3000;

// CORS
const DEFAULT_ALLOWED_ORIGINS = [
  'https://pricelio.app',
  'https://www.pricelio.app',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:3000',
  'http://38.242.217.82:8000',
  'http://38.242.217.82',
];
const ALLOWED_ORIGINS = new Set(
  String(process.env.CORS_ALLOWLIST || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',').map((o) => o.trim()).filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    if (/^https:\/\/([a-z0-9-]+\.)?pricelio\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));

// Trace ID
app.use((req, res, next) => {
  req.traceId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex');
  res.setHeader('x-trace-id', req.traceId);
  next();
});

// Latency tracking
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const routePath = req.route?.path || normalizeLatencyPath(req.path);
    trackEndpointLatency(`${req.method} ${routePath}`, elapsedMs);
  });
  next();
});

// Error payload normalization
function normalizeErrorPayload(payload, traceId) {
  if (!payload || typeof payload !== 'object') {
    return { error: { code: 'unknown_error', message: 'Unknown error', trace_id: traceId } };
  }
  if (payload.error && typeof payload.error === 'object' && payload.error.code) {
    return { ...payload, error: { ...payload.error, trace_id: payload.error.trace_id || traceId } };
  }
  if (typeof payload.error === 'string') {
    return { ...payload, error: { code: payload.error, message: payload.message || payload.error, trace_id: traceId } };
  }
  return { error: { code: payload.code || 'request_failed', message: payload.message || 'Request failed', trace_id: traceId } };
}

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode >= 400) return originalJson(normalizeErrorPayload(payload, req.traceId));
    return originalJson(payload);
  };
  next();
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  message: { error: 'too_many_requests' },
  standardHeaders: true, legacyHeaders: false
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API_MAX || 200),
  message: { error: 'too_many_requests' },
  standardHeaders: true, legacyHeaders: false
});

app.use('/auth', authLimiter);
app.use(apiLimiter);

// SSE alert publisher
alerts.setNotificationPublisher(async (userId, notification) => {
  if (notification?.type !== 'PRICE_DROP') return;
  sse.broadcastPriceDrop({
    product_id: notification.productId || null,
    store_chain: notification.store || null,
    old_price: notification.oldPrice ?? null,
    new_price: notification.price ?? null,
    drop_percent: notification.oldPrice && notification.price
      ? Number((((notification.oldPrice - notification.price) / notification.oldPrice) * 100).toFixed(2))
      : null,
    occurred_at: new Date().toISOString()
  }, { userIds: [userId] });
});

// Register all routes
registerHealth(app);
registerEvents(app);
registerDemo(app);
registerAuth(app);
registerUser(app);
registerGamification(app);
registerStores(app);
registerProducts(app);
registerBaskets(app);
registerFamilies(app);
registerReceipts(app);
registerAlerts(app);
registerMisc(app);
registerMissions(app);
registerAdmin(app);
registerInternal(app);

// Global error handler
app.use((error, req, res, next) => {
  if (error?.message === 'unsupported_file_type') return res.status(400).json({ error: 'unsupported_file_type' });
  if (error?.message && String(error.message).startsWith('CORS:')) return res.status(403).json({ error: 'cors_not_allowed' });
  console.error('Unhandled API error:', error?.message || error);
  return res.status(500).json({ error: 'internal_server_error' });
});

app.listen(port, () => {
  console.log(`PRICELIO API running on port ${port}`);
  console.log('✅ All features enabled:');
  console.log('  - Alerts & Notifications');
  console.log('  - Project Baskets');
  console.log('  - Barcode Scanner');
  console.log('  - ShelfSnap');
  console.log('  - Package Size Traps');
  console.log('  - Warranty Vault');
});
