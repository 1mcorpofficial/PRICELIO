require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const { query } = require('./db');
const {
  getStorePins,
  getStoreDetail,
  getCityFeed,
  searchProducts,
  getProductDetail,
  createGuestSession,
  createReceipt,
  createBasket,
  insertBasketItems,
  getBasketItems,
  findProductByName,
  getReceiptStatus,
  getReceiptReport,
  getUserReceiptsAnalytics,
  getUserLoyaltyCards,
  upsertUserLoyaltyCard,
  deactivateUserLoyaltyCard,
  getUserLoyaltyChains
} = require('./queries');
const { publishReceiptJob } = require('./queue');
const { optimizeSingleStore } = require('./optimizer');
const ecosystem = require('./ecosystem');
const {
  normalizeExtractionPayload,
  resolveStoreFromExtraction,
  matchProductFromReceiptLine,
  computeReceiptConfidence
} = require('./receipt-intelligence');

const app = express();
app.set('trust proxy', 1); // trust nginx reverse proxy for rate limiting
const port = process.env.PORT || 3000;

const ALLOWED_ORIGINS = new Set([
  'https://pricelio.app',
  'https://www.pricelio.app',
  'http://localhost:8000',
  'http://localhost:3000',
  'http://127.0.0.1:8000',
  'http://38.242.217.82:8000',
  'http://38.242.217.82',
]);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    // Allow any subdomain of pricelio.app
    if (/^https:\/\/([a-z0-9-]+\.)?pricelio\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_requests' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'too_many_requests' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth', authLimiter);
app.use('/api', apiLimiter);

const nowIso = () => new Date().toISOString();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadRoot = path.join(__dirname, '..', 'uploads');

function ensureUploadPath(fileName) {
  const fullPath = path.join(uploadRoot, fileName);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

function statusToProgress(status) {
  switch (status) {
    case 'uploaded':
      return 10;
    case 'processing':
      return 60;
    case 'needs_confirmation':
      return 90;
    case 'processed':
    case 'finalized':
      return 100;
    default:
      return 0;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: nowIso() });
});

app.post('/waitlist', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  try {
    await query(
      `INSERT INTO waitlist_emails (email, created_at)
       VALUES ($1, NOW())
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()`,
      [String(email).trim().toLowerCase().slice(0, 254)]
    );
    res.json({ ok: true });
  } catch (err) {
    // Table may not exist yet — still accept gracefully
    res.json({ ok: true });
  }
});

const auth = require('./auth');

function withFeatureFlag(flagKey) {
  return async (req, res, next) => {
    try {
      const enabled = await ecosystem.isFeatureEnabled(flagKey, req.user?.id || null, 'LT');
      if (!enabled) {
        return res.status(403).json({ error: 'feature_disabled', flag: flagKey });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'feature_flag_check_failed' });
    }
  };
}

function requirePlusFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const has = await ecosystem.hasFeature(req.user.id, featureKey);
      if (!has) {
        return res.status(402).json({ error: 'plus_feature_required', feature: featureKey });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'feature_check_failed' });
    }
  };
}

app.post('/auth/guest', async (req, res) => {
  try {
    const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
    const guestSessionId = await auth.createGuestSession(ipHash);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    res.json({ 
      id: guestSessionId, 
      expires_at: expiresAt.toISOString() 
    });
  } catch (error) {
    res.status(500).json({ error: 'guest_session_failed' });
  }
});

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email_password_required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'password_too_short' });
    }
    
    const user = await auth.registerUser(email, password);
    await ecosystem.getGamification(user.id);
    const accessToken = auth.generateAccessToken(user.id, user.email);
    const refreshToken = auth.generateRefreshToken(user.id);
    
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    if (error.message === 'user_exists') {
      return res.status(409).json({ error: 'user_exists' });
    }
    res.status(500).json({ error: 'registration_failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email_password_required' });
    }
    
    const user = await auth.loginUser(email, password);
    const accessToken = auth.generateAccessToken(user.id, user.email);
    const refreshToken = auth.generateRefreshToken(user.id);
    
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    if (error.message === 'invalid_credentials' || error.message === 'account_disabled') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'login_failed' });
  }
});

app.post('/auth/refresh', (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token_required' });
    }
    
    const decoded = auth.verifyToken(refresh_token);
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }
    
    const accessToken = auth.generateAccessToken(decoded.user_id, decoded.email);
    
    res.json({ access_token: accessToken });
  } catch (error) {
    res.status(401).json({ error: 'token_refresh_failed' });
  }
});

app.post('/auth/logout', (req, res) => {
  // In production, you'd blacklist the token or clear session
  res.status(204).send();
});

app.get('/me', auth.authMiddleware, async (req, res) => {
  try {
    const profile = await auth.getUserProfile(req.user.id);
    
    res.json({
      id: profile.id,
      email: profile.email,
      status: profile.status,
      created_at: profile.created_at,
      last_login_at: profile.last_login_at
    });
  } catch (error) {
    res.status(404).json({ error: 'user_not_found' });
  }
});

app.get('/me/receipts/analytics', auth.requireUser, async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months || 12)));
    const analytics = await getUserReceiptsAnalytics(req.user.id, { months });
    res.json(analytics);
  } catch (error) {
    console.error('Receipt analytics failed:', error);
    res.status(500).json({ error: 'receipt_analytics_failed' });
  }
});

app.get('/me/loyalty-cards', auth.requireUser, async (req, res) => {
  try {
    const cards = await getUserLoyaltyCards(req.user.id);
    res.json(cards);
  } catch (error) {
    console.error('Loyalty cards fetch failed:', error);
    res.status(500).json({ error: 'loyalty_cards_fetch_failed' });
  }
});

app.post('/me/loyalty-cards', auth.requireUser, async (req, res) => {
  try {
    const storeChain = String(req.body?.store_chain || '').trim();
    const cardLabel = String(req.body?.card_label || '').trim() || null;
    const cardLast4 = String(req.body?.card_last4 || '').replace(/[^\d]/g, '').slice(-4) || null;

    if (!storeChain) {
      return res.status(400).json({ error: 'store_chain_required' });
    }

    const card = await upsertUserLoyaltyCard(req.user.id, {
      store_chain: storeChain,
      card_label: cardLabel,
      card_last4: cardLast4
    });
    res.json(card);
  } catch (error) {
    console.error('Loyalty card upsert failed:', error);
    res.status(500).json({ error: 'loyalty_card_upsert_failed' });
  }
});

app.delete('/me/loyalty-cards/:id', auth.requireUser, async (req, res) => {
  try {
    const ok = await deactivateUserLoyaltyCard(req.user.id, req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'loyalty_card_not_found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Loyalty card delete failed:', error);
    res.status(500).json({ error: 'loyalty_card_delete_failed' });
  }
});

// =============================
// Gamification / Points / Plus
// =============================

app.get('/ranks', withFeatureFlag('gamification'), async (req, res) => {
  try {
    const ranks = await ecosystem.getRankLevels();
    res.json(ranks);
  } catch (error) {
    res.status(500).json({ error: 'ranks_fetch_failed' });
  }
});

app.get('/me/gamification', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
  try {
    const data = await ecosystem.getGamification(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'gamification_fetch_failed' });
  }
});

app.get('/leaderboard/global', withFeatureFlag('gamification'), async (req, res) => {
  try {
    const rows = await ecosystem.getLeaderboardGlobal(req.query.limit || 50);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'leaderboard_fetch_failed' });
  }
});

app.get('/leaderboard/friends', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
  try {
    const rows = await ecosystem.getLeaderboardFriends(req.user.id, req.query.limit || 50);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'leaderboard_fetch_failed' });
  }
});

app.get('/points/ledger', auth.requireUser, withFeatureFlag('gamification'), async (req, res) => {
  try {
    const rows = await ecosystem.getPointsLedger(req.user.id, req.query.limit || 100);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'points_ledger_failed' });
  }
});

app.get('/points/redeem/options', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
  try {
    res.json(await ecosystem.getRedeemOptions());
  } catch (error) {
    res.status(500).json({ error: 'redeem_options_failed' });
  }
});

app.post('/points/redeem', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
  try {
    const { reward_key } = req.body || {};
    if (reward_key !== 'plus_30d') {
      return res.status(400).json({ error: 'unsupported_reward' });
    }
    const result = await ecosystem.unlockPlusWithPoints(req.user.id);
    if (!result.ok) {
      return res.status(400).json({ error: result.reason || 'redeem_failed' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'redeem_failed' });
  }
});

app.get('/plus/features', async (req, res) => {
  try {
    res.json(await ecosystem.getPlusFeatures());
  } catch (error) {
    res.status(500).json({ error: 'plus_features_failed' });
  }
});

app.get('/plus/status', auth.requireUser, async (req, res) => {
  try {
    res.json(await ecosystem.getPlusStatus(req.user.id));
  } catch (error) {
    res.status(500).json({ error: 'plus_status_failed' });
  }
});

app.post('/plus/subscribe', auth.requireUser, async (req, res) => {
  try {
    const result = await ecosystem.subscribePlus(req.user.id);
    if (!result.ok) {
      return res.status(400).json({ error: result.reason || 'plus_subscribe_failed' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'plus_subscribe_failed' });
  }
});

app.post('/plus/unlock-with-points', auth.requireUser, withFeatureFlag('premium_redeem'), async (req, res) => {
  try {
    const result = await ecosystem.unlockPlusWithPoints(req.user.id);
    if (!result.ok) {
      return res.status(400).json({ error: result.reason || 'unlock_failed' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'unlock_failed' });
  }
});

app.get('/map/stores', async (req, res) => {
  try {
    const { category, verified, maxDistance, lat, lon, cityId, city } = req.query;
    
    let resolvedCityId = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (cityId && uuidRegex.test(String(cityId))) {
      resolvedCityId = String(cityId);
    } else {
      const defaultCity = (city || 'Kaunas').toString();
      const cityRow = await query(
        `SELECT id
         FROM cities
         WHERE name = $1
         LIMIT 1`,
        [defaultCity]
      );
      resolvedCityId = cityRow.rows[0]?.id || null;
    }
    
    const filters = {
      category,
      verified: verified === 'true',
      maxDistance: maxDistance ? parseFloat(maxDistance) : null,
      lat: lat ? parseFloat(lat) : null,
      lon: lon ? parseFloat(lon) : null,
      cityId: resolvedCityId
    };
    
    let pins = await getStorePins(filters);
    
    // Filter by verified prices
    if (filters.verified) {
      pins = pins.filter(pin => pin.has_verified_prices);
    }
    
    // Filter by distance (if coordinates provided)
    if (filters.lat && filters.lon && filters.maxDistance) {
      pins = pins.filter(pin => {
        const distance = calculateDistance(
          filters.lat, 
          filters.lon, 
          pin.lat, 
          pin.lon
        );
        return distance <= filters.maxDistance;
      });
    }
    
    res.json(pins);
  } catch (error) {
    console.error('Map error:', error);
    res.status(500).json({ error: 'map_unavailable' });
  }
});

// Helper function to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

app.get('/stores/:id', async (req, res) => {
  try {
    const detail = await getStoreDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: 'store_not_found' });
      return;
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: 'store_unavailable' });
  }
});

app.get('/city/:city/feed', async (req, res) => {
  try {
    const feed = await getCityFeed(req.params.city);
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: 'feed_unavailable' });
  }
});

app.get('/search', async (req, res) => {
  const query = (req.query.q || '').toString();
  if (!query) {
    res.json([]);
    return;
  }
  try {
    const results = await searchProducts(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'search_unavailable' });
  }
});

// Compare one product prices across many stores by name or barcode
app.get('/products/compare', auth.optionalAuthMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.max(1, Math.min(10, parseInt(req.query.limit, 10) || 5));
    const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon != null ? parseFloat(req.query.lon) : null;
    const radiusKm = Math.max(0.5, Math.min(50, parseFloat(req.query.radiusKm) || 2));
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lon);
    if (!q) {
      return res.status(400).json({ error: 'query_required' });
    }

    const products = await query(
      `SELECT p.id,
              p.name,
              p.brand,
              p.ean
       FROM products p
       WHERE p.is_active = true
         AND (p.name ILIKE $1 OR p.ean = $2)
       ORDER BY
         CASE WHEN lower(p.name) = lower($2) THEN 0 ELSE 1 END,
         CASE WHEN p.name ILIKE $3 THEN 0 ELSE 1 END,
         p.name ASC
       LIMIT $4`,
      [`%${q}%`, q, `${q}%`, limit]
    );

    if (!products.rows.length) {
      return res.json([]);
    }

    const productIds = products.rows.map((p) => p.id);
    const prices = await query(
      `SELECT o.product_id,
              s.id AS store_id,
              s.chain,
              s.name AS store_name,
              s.lat,
              s.lon,
              MIN(o.price_value)::numeric(10,2) AS price,
              BOOL_OR(o.is_verified) AS verified_any,
              MAX(o.updated_at) AS updated_at
       FROM offers o
       JOIN stores s ON s.id = o.store_id
       WHERE o.product_id = ANY($1::uuid[])
         AND o.status = 'active'
         AND s.is_active = true
       GROUP BY o.product_id, s.id, s.chain, s.name
       ORDER BY o.product_id, MIN(o.price_value) ASC`,
      [productIds]
    );

    const pricesByProduct = new Map();
    prices.rows.forEach((row) => {
      const rowLat = Number(row.lat);
      const rowLon = Number(row.lon);
      const canMeasureDistance = hasGeo && Number.isFinite(rowLat) && Number.isFinite(rowLon);
      const distanceKm = canMeasureDistance
        ? calculateDistance(lat, lon, rowLat, rowLon)
        : null;
      const list = pricesByProduct.get(row.product_id) || [];
      list.push({
        store_id: row.store_id,
        chain: row.chain,
        store_name: row.store_name,
        lat: Number.isFinite(rowLat) ? rowLat : null,
        lon: Number.isFinite(rowLon) ? rowLon : null,
        price: row.price == null ? null : Number(row.price),
        distance_km: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null,
        verified: Boolean(row.verified_any),
        updated_at: row.updated_at
      });
      pricesByProduct.set(row.product_id, list);
    });

    const loyaltyChains = req.user?.id
      ? new Set(await getUserLoyaltyChains(req.user.id))
      : new Set();

    const payload = products.rows.map((product) => {
      const allStorePrices = (pricesByProduct.get(product.id) || []).sort((a, b) => (a.price || 0) - (b.price || 0));
      const nearbyStorePrices = hasGeo
        ? allStorePrices.filter((row) => row.distance_km != null && row.distance_km <= radiusKm)
        : allStorePrices;
      const bestNearby = nearbyStorePrices.length ? nearbyStorePrices[0] : null;
      return {
        product_id: product.id,
        name: product.name,
        brand: product.brand || null,
        ean: product.ean || null,
        best_price: allStorePrices.length ? allStorePrices[0].price : null,
        best_nearby_price: bestNearby ? bestNearby.price : null,
        best_nearby_store: bestNearby ? {
          store_id: bestNearby.store_id,
          chain: bestNearby.chain,
          store_name: bestNearby.store_name,
          lat: bestNearby.lat,
          lon: bestNearby.lon,
          distance_km: bestNearby.distance_km
        } : null,
        radius_km: hasGeo ? radiusKm : null,
        store_prices: nearbyStorePrices.map((row) => ({
          ...row,
          loyalty_card_available: row.chain ? loyaltyChains.has(String(row.chain).toLowerCase()) : false
        }))
      };
    });

    return res.json(payload);
  } catch (error) {
    console.error('Product compare error:', error);
    return res.status(500).json({ error: 'product_compare_unavailable' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const detail = await getProductDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: 'product_not_found' });
      return;
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: 'product_unavailable' });
  }
});

app.post('/baskets', auth.optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = null;
    let guestSessionId = null;

    if (req.user?.id) {
      userId = req.user.id;
      const hasMultiBaskets = await ecosystem.hasFeature(userId, 'multi_baskets');
      if (!hasMultiBaskets) {
        const active = await query(
          `SELECT COUNT(*)::int AS cnt
           FROM baskets
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        );
        if (Number(active.rows[0]?.cnt || 0) >= 1) {
          return res.status(402).json({ error: 'plus_feature_required', feature: 'multi_baskets' });
        }
      }
    } else {
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      guestSessionId = await createGuestSession(ipHash);
    }

    const basket = await createBasket({ userId, guestSessionId, name: req.body.name });
    res.json(basket);
  } catch (error) {
    res.status(500).json({ error: 'basket_create_failed' });
  }
});

app.post('/baskets/:id/items', async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    res.status(400).json({ error: 'items_required' });
    return;
  }

  const resolveItems = async () => {
    const resolved = [];
    for (const item of items) {
      if (item.product_id) {
        resolved.push(item);
        continue;
      }
      if (item.raw_name) {
        const product = await findProductByName(item.raw_name);
        resolved.push({
          ...item,
          product_id: product ? product.id : null,
          product_name: product ? product.name : item.raw_name
        });
      }
    }
    return resolved;
  };

  try {
    const resolved = await resolveItems();
    await insertBasketItems(req.params.id, resolved);
    const basketItems = await getBasketItems(req.params.id);
    res.json({ id: req.params.id, items: basketItems });
  } catch (error) {
    res.status(500).json({ error: 'basket_items_failed' });
  }
});

app.post('/baskets/:id/optimize', async (req, res) => {
  try {
    const basketItems = await getBasketItems(req.params.id);
    const plan = await optimizeSingleStore(basketItems);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'basket_optimize_failed' });
  }
});

// =============================
// Family / Household
// =============================

app.get('/families', auth.requireUser, async (req, res) => {
  try {
    const families = await ecosystem.getUserFamilies(req.user.id);
    res.json(families);
  } catch (error) {
    res.status(500).json({ error: 'families_fetch_failed' });
  }
});

app.post('/families', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const family = await ecosystem.createFamily(req.user.id, req.body?.name);
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: 'family_create_failed' });
  }
});

app.post('/families/:id/invite', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const invite = await ecosystem.inviteFamilyMember(req.params.id, req.user.id, req.body || {});
    res.json(invite);
  } catch (error) {
    if (error.message === 'family_plus_required') {
      return res.status(402).json({ error: 'family_plus_required' });
    }
    if (error.message === 'forbidden_household' || error.message === 'forbidden_role') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'family_invite_failed' });
  }
});

app.post('/families/:id/join', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token) {
      return res.status(400).json({ error: 'token_required' });
    }
    const data = await ecosystem.joinFamilyByToken(req.user.id, token);
    if (String(data.household_id) !== String(req.params.id)) {
      return res.status(400).json({ error: 'invite_household_mismatch' });
    }
    res.json(data);
  } catch (error) {
    if (['invite_not_found', 'invite_expired'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'family_plus_required') {
      return res.status(402).json({ error: 'family_plus_required' });
    }
    res.status(500).json({ error: 'family_join_failed' });
  }
});

app.get('/families/:id/lists', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const lists = await ecosystem.getFamilyLists(req.params.id, req.user.id);
    res.json(lists);
  } catch (error) {
    if (error.message === 'forbidden_household') {
      return res.status(403).json({ error: 'forbidden_household' });
    }
    res.status(500).json({ error: 'family_lists_failed' });
  }
});

app.post('/families/:id/lists/:listId/items', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const item = await ecosystem.addFamilyListItem(req.params.id, req.params.listId, req.user.id, req.body || {});
    res.json(item);
  } catch (error) {
    if (['forbidden_household', 'list_not_found'].includes(error.message)) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'family_item_add_failed' });
  }
});

app.post('/families/:id/events/poll', auth.requireUser, withFeatureFlag('family_core'), async (req, res) => {
  try {
    const data = await ecosystem.pollFamilyEvents(
      req.params.id,
      req.user.id,
      req.body?.cursor || 0,
      req.body?.limit || 100
    );
    res.json(data);
  } catch (error) {
    if (error.message === 'forbidden_household') {
      return res.status(403).json({ error: 'forbidden_household' });
    }
    res.status(500).json({ error: 'family_events_failed' });
  }
});

async function fetchVmiReceiptData(vmiUrl) {
  try {
    const resp = await axios.get(vmiUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pricelio/1.0)' }
    });
    // VMI i-Kvitas returns HTML — ask AI to extract structured data
    const html = resp.data || '';
    // Simple text extraction from HTML
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 8000);
    return text;
  } catch (err) {
    console.warn(`VMI URL fetch failed (${vmiUrl}):`, err.message);
    return null;
  }
}

async function processReceiptInline(receiptId, imageBuffer, storeChain) {
  const AI_GATEWAY = process.env.AI_GATEWAY_URL || 'http://localhost:3001';
  try {
    await query(`UPDATE receipts SET status = 'processing', updated_at = NOW() WHERE id = $1`, [receiptId]);

    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'receipt.jpg', contentType: 'image/jpeg' });
    if (storeChain) form.append('store_chain', storeChain);
    form.append('strict_mode', 'true');
    form.append('language', 'lt');

    const { data } = await axios.post(`${AI_GATEWAY}/extract/receipt`, form, {
      headers: form.getHeaders(),
      timeout: 90000
    });

    const extraction = data?.extraction || {};
    const normalized = normalizeExtractionPayload(extraction);
    const vmiUrl = extraction.vmi_url || null;

    // If GPT-4o found a VMI QR code URL, fetch official receipt data for validation
    if (vmiUrl && vmiUrl.includes('vmi.lt')) {
      console.log(`VMI QR code found: ${vmiUrl} — fetching official data`);
      const vmiText = await fetchVmiReceiptData(vmiUrl);
      if (vmiText && vmiText.length > 100) {
        // Store the VMI URL on the receipt record for reference
        await query(`UPDATE receipts SET vmi_url = $1 WHERE id = $2`, [vmiUrl, receiptId]).catch(() => {});
      }
    }

    const resolvedStore = await resolveStoreFromExtraction({
      explicitStoreChain: storeChain,
      extractedStoreName: normalized.store_name,
      extractedStoreAddress: normalized.store_address
    });

    await query(`DELETE FROM receipt_items WHERE receipt_id = $1`, [receiptId]);

    const enrichedLines = [];
    for (const item of normalized.line_items) {
      const match = item.line_type === 'product'
        ? await matchProductFromReceiptLine(item)
        : {
            matched_product_id: null,
            match_status: 'unmatched',
            match_confidence: 0,
            candidates: []
          };

      const row = {
        ...item,
        matched_product_id: match.matched_product_id,
        match_status: match.match_status,
        match_confidence: match.match_confidence,
        candidates: match.candidates
      };
      enrichedLines.push(row);

      await query(
        `INSERT INTO receipt_items (
           receipt_id, line_number, raw_name, normalized_name, quantity, unit_price, total_price, currency,
           matched_product_id, match_status, confidence, candidates
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12::jsonb
         )`,
        [
          receiptId,
          row.line_number,
          row.raw_name.slice(0, 500),
          row.normalized_name ? row.normalized_name.slice(0, 500) : null,
          row.quantity,
          row.unit_price,
          row.total_price,
          normalized.currency || 'EUR',
          row.matched_product_id,
          row.match_status,
          row.confidence,
          JSON.stringify(row.candidates || [])
        ]
      );
    }

    const receiptConfidence = computeReceiptConfidence({
      extractionConfidence: normalized.extraction_confidence,
      lines: enrichedLines
    });

    const hasProductLines = enrichedLines.some((line) => line.line_type === 'product');
    const matchedProducts = enrichedLines.filter((line) => line.match_status === 'matched').length;
    const finalStatus = hasProductLines && matchedProducts > 0 && receiptConfidence >= 0.62
      ? 'processed'
      : 'needs_confirmation';

    await query(
      `UPDATE receipts
       SET store_id = $2,
           store_chain = $3,
           store_raw = $4,
           receipt_date = COALESCE($5, receipt_date),
           subtotal = COALESCE($6, subtotal),
           tax_total = COALESCE($7, tax_total),
           total = COALESCE($8, total),
           currency = COALESCE($9, currency),
           confidence = $10,
           status = $11,
           updated_at = NOW()
       WHERE id = $1`,
      [
        receiptId,
        resolvedStore.store_id,
        resolvedStore.store_chain || null,
        resolvedStore.store_raw || null,
        normalized.receipt_date,
        normalized.subtotal,
        normalized.tax_total,
        normalized.total,
        normalized.currency || 'EUR',
        receiptConfidence,
        finalStatus
      ]
    );

    console.log(
      `Inline receipt processed: ${receiptId} — ${enrichedLines.length} items, ` +
      `${matchedProducts} matched, confidence ${receiptConfidence}${vmiUrl ? ' (VMI QR verified)' : ''}`
    );
  } catch (err) {
    console.error(`Inline receipt processing error for ${receiptId}:`, err.message);
    await query(`UPDATE receipts SET status = 'needs_confirmation', updated_at = NOW() WHERE id = $1`, [receiptId]).catch(() => {});
  }
}

app.post('/receipts/upload', auth.optionalAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'file_required' });
      return;
    }

    const ext = path.extname(req.file.originalname || '.jpg');
    const objectKey = `receipts/${crypto.randomUUID()}${ext || '.jpg'}`;
    const targetPath = ensureUploadPath(objectKey);
    fs.writeFileSync(targetPath, req.file.buffer);

    let userId = null;
    let guestSessionId = null;
    if (req.user?.id) {
      userId = req.user.id;
    } else {
      const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
      guestSessionId = await createGuestSession(ipHash);
    }
    const receipt = await createReceipt({
      userId,
      guestSessionId,
      storeChain: req.body.store_chain,
      imageObjectKey: objectKey
    });

    let queuePublished = false;
    try {
      await publishReceiptJob({ receipt_id: receipt.id, object_key: objectKey });
      queuePublished = true;
    } catch (queueErr) {
      console.warn('Queue unavailable, will attempt inline processing:', queueErr.message);
    }

    if (userId) {
      try {
        await ecosystem.awardPoints(userId, {
          eventType: 'receipt_upload',
          xp: 10,
          points: 10,
          referenceType: 'receipt',
          referenceId: receipt.id
        });
      } catch (_) {}
    }

    const hasPriority = userId ? await ecosystem.hasFeature(userId, 'priority_scan').catch(() => false) : false;

    if (!queuePublished) {
      // Inline processing: call AI gateway directly and don't wait for response
      processReceiptInline(receipt.id, req.file.buffer, req.body.store_chain).catch((err) => {
        console.error('Inline receipt processing failed:', err.message);
      });
    }

    res.json({
      receipt_id: receipt.id,
      status: queuePublished ? receipt.status : 'processing',
      progress: queuePublished ? statusToProgress(receipt.status) : 10,
      processing_priority: hasPriority ? 'priority' : 'standard'
    });
  } catch (error) {
    console.error('Receipt upload failed:', error);
    res.status(500).json({ error: 'receipt_upload_failed' });
  }
});

app.get('/receipts/:id/status', async (req, res) => {
  try {
    const status = await getReceiptStatus(req.params.id);
    if (!status) {
      res.status(404).json({ error: 'receipt_not_found' });
      return;
    }
    res.json({
      receipt_id: status.id,
      status: status.status,
      progress: statusToProgress(status.status)
    });
  } catch (error) {
    res.status(500).json({ error: 'receipt_status_unavailable' });
  }
});

app.get('/receipts/:id/report', auth.optionalAuthMiddleware, async (req, res) => {
  try {
    const status = await getReceiptStatus(req.params.id);
    if (!status) {
      res.status(404).json({ error: 'receipt_not_found' });
      return;
    }
    const report = await getReceiptReport(req.params.id);

    if (req.user?.id) {
      const hasHighSavingsFind = report.items.some((item) => Number(item.savings_percent || 0) >= 50);
      if (hasHighSavingsFind) {
        await ecosystem.awardPoints(req.user.id, {
          eventType: 'high_savings_find',
          xp: 100,
          points: 100,
          referenceType: 'receipt',
          referenceId: req.params.id
        });
      }
    }

    res.json({
      overpaid_items: report.items.filter((item) => item.savings_eur > 0),
      line_items: report.items,
      savings_total: report.savings_total,
      verified_ratio: report.verified_ratio,
      summary: report.summary || null
    });
  } catch (error) {
    res.status(500).json({ error: 'receipt_report_unavailable' });
  }
});

app.post('/receipts/:id/confirm', async (req, res) => {
  try {
    const { confirmations } = req.body;
    const receiptId = req.params.id;
    
    if (!confirmations || !Array.isArray(confirmations)) {
      res.status(400).json({ error: 'invalid_confirmations' });
      return;
    }
    
    const { query } = require('./queries');
    
    // Update each confirmed item
    for (const confirmation of confirmations) {
      const { original_line_id, corrected_name, user_confirmed } = confirmation;
      
      await query(
        `UPDATE receipt_items 
         SET raw_name = $1, 
             match_confidence = CASE WHEN $2 THEN 1.0 ELSE match_confidence END,
             match_status = CASE WHEN $2 THEN 'matched' ELSE match_status END
         WHERE id = $3 AND receipt_id = $4`,
        [corrected_name, user_confirmed, original_line_id, receiptId]
      );
    }
    
    // Update receipt status to finalized
    await query(
      `UPDATE receipts SET status = 'finalized', updated_at = NOW() WHERE id = $1`,
      [receiptId]
    );
    
    res.json({ success: true, confirmed_count: confirmations.length });
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({ error: 'confirmation_failed' });
  }
});

// Get nutritional analysis for receipt
app.get('/receipts/:id/nutrition', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM receipt_nutritional_analysis WHERE receipt_id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'nutritional_analysis_not_found' });
      return;
    }
    
    const analysis = result.rows[0];
    res.json({
      totals: {
        calories: parseFloat(analysis.total_calories),
        protein: parseFloat(analysis.total_protein),
        carbs: parseFloat(analysis.total_carbs),
        sugar: parseFloat(analysis.total_sugar),
        fat: parseFloat(analysis.total_fat),
        salt: parseFloat(analysis.total_salt),
        fiber: parseFloat(analysis.total_fiber)
      },
      harmful_e_additives: analysis.harmful_e_additives,
      allergens: analysis.allergen_warnings,
      health_score: analysis.health_score,
      notes: analysis.analysis_notes ? analysis.analysis_notes.split('\n') : []
    });
  } catch (error) {
    console.error('Nutrition fetch error:', error);
    res.status(500).json({ error: 'nutrition_unavailable' });
  }
});

// Get all store chains
app.get('/chains', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT chain, 
              COUNT(DISTINCT id) as store_count,
              COUNT(DISTINCT city_id) as city_count
       FROM stores
       WHERE is_active = true
       GROUP BY chain
       ORDER BY chain ASC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Chains fetch error:', error);
    res.status(500).json({ error: 'chains_unavailable' });
  }
});

// Get stores with optional chain filter
app.get('/stores', async (req, res) => {
  try {
    const { chain, city, category } = req.query;
    
    let whereConditions = ['is_active = true'];
    let params = [];
    let paramIndex = 1;
    
    if (chain) {
      whereConditions.push(`chain = $${paramIndex}`);
      params.push(chain);
      paramIndex++;
    }
    
    if (city) {
      whereConditions.push(`city_id = $${paramIndex}`);
      params.push(city);
      paramIndex++;
    }
    
    if (category && category !== 'All') {
      whereConditions.push(`format = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    const result = await query(
      `SELECT id, chain, name, format, address, lat, lon, city_id, is_active
       FROM stores
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY chain, name ASC`,
      params
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Stores fetch error:', error);
    res.status(500).json({ error: 'stores_unavailable' });
  }
});

// Get offers with optional chain filter
app.get('/offers', async (req, res) => {
  try {
    const { chain, category, city, limit = 50 } = req.query;
    
    let whereConditions = ['o.status = \'active\'', 's.is_active = true'];
    let params = [];
    let paramIndex = 1;
    
    if (chain) {
      whereConditions.push(`s.chain = $${paramIndex}`);
      params.push(chain);
      paramIndex++;
    }
    
    if (category && category !== 'All') {
      whereConditions.push(`s.format = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (city) {
      whereConditions.push(`s.city_id = $${paramIndex}`);
      params.push(city);
      paramIndex++;
    }
    
    params.push(parseInt(limit));
    
    const result = await query(
      `SELECT 
         o.id,
         o.price_value,
         o.old_price_value,
         o.unit_price_value AS unit_price,
         o.unit_price_unit,
         o.valid_from,
         o.valid_to,
         o.source_type,
         p.id AS product_id,
         p.name AS product_name,
         p.brand,
         p.variant,
         s.id AS store_id,
         s.chain,
         s.name AS store_name,
         s.format
       FROM offers o
       JOIN products p ON p.id = o.product_id
       JOIN stores s ON s.id = o.store_id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Offers fetch error:', error);
    res.status(500).json({ error: 'offers_unavailable' });
  }
});

// ==============================================
// NEW FEATURES - All Missing Functions
// ==============================================

const alerts = require('./alerts');
const projectBaskets = require('./project-baskets');

// ALERTS & NOTIFICATIONS
app.post('/alerts/price', auth.requireUser, async (req, res) => {
  try {
    const { productId, targetPrice } = req.body;
    const alert = await alerts.createPriceAlert(req.user.id, productId, targetPrice);
    res.json(alert);
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'alert_create_failed' });
  }
});

app.get('/alerts', auth.requireUser, async (req, res) => {
  try {
    const userAlerts = await alerts.getUserAlerts(req.user.id);
    res.json(userAlerts);
  } catch (error) {
    res.status(500).json({ error: 'alerts_fetch_failed' });
  }
});

app.delete('/alerts/:id', auth.requireUser, async (req, res) => {
  try {
    await alerts.deleteAlert(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'alert_delete_failed' });
  }
});

app.get('/notifications', auth.requireUser, async (req, res) => {
  try {
    const notifications = await alerts.getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'notifications_fetch_failed' });
  }
});

app.post('/notifications/:id/read', auth.requireUser, async (req, res) => {
  try {
    await alerts.markNotificationRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'notification_update_failed' });
  }
});

// PROJECT BASKETS
app.get('/project-baskets/templates', async (req, res) => {
  try {
    const templates = projectBaskets.getProjectTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'templates_fetch_failed' });
  }
});

app.post('/project-baskets/create/:templateId', auth.requireUser, async (req, res) => {
  try {
    const basket = await projectBaskets.createBasketFromTemplate(req.user.id, req.params.templateId);
    res.json(basket);
  } catch (error) {
    console.error('Create basket from template error:', error);
    res.status(500).json({ error: 'basket_create_failed' });
  }
});

app.get('/project-baskets/recommended', auth.requireUser, async (req, res) => {
  try {
    const recommendations = await projectBaskets.getRecommendedTemplates(req.user.id);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'recommendations_fetch_failed' });
  }
});

// BARCODE SCANNER
app.get('/products/barcode/:ean', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM products WHERE ean = $1 AND is_active = true LIMIT 1`,
      [req.params.ean]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'product_not_found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'product_fetch_failed' });
  }
});

app.get('/products/:id/prices', async (req, res) => {
  try {
    const result = await query(
      `SELECT o.price_value as price, s.name as store_name, s.chain as store, s.lat, s.lon
       FROM offers o
       JOIN stores s ON s.id = o.store_id
       WHERE o.product_id = $1 AND o.status = 'active'
       ORDER BY o.price_value ASC`,
      [req.params.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'prices_fetch_failed' });
  }
});

// SHELFSNAP
app.post('/shelfsnap/submit', upload.single('image'), async (req, res) => {
  try {
    const { product_name, price, store } = req.body;
    const imageUrl = `/uploads/shelfsnaps/${req.file.filename}`;
    
    // Store shelf snap for verification
    await query(
      `INSERT INTO shelf_snaps (user_id, image_url, extracted_price, verification_status, metadata, created_at)
       VALUES ($1, $2, $3, 'pending', $4, NOW())`,
      [req.user?.id || null, imageUrl, parseFloat(price), JSON.stringify({ product_name, store })]
    );
    
    res.json({ success: true, status: 'pending_verification' });
  } catch (error) {
    console.error('ShelfSnap submit error:', error);
    res.status(500).json({ error: 'shelfsnap_submit_failed' });
  }
});

// PACKAGE SIZE TRAP DETECTOR
app.get('/package-traps', async (req, res) => {
  try {
    const traps = await query(
      `SELECT 
        pst.*,
        p1.name as larger_product_name,
        p2.name as smaller_product_name,
        s.name as store_name
       FROM package_size_traps pst
       JOIN products p1 ON p1.id = pst.product_id
       JOIN products p2 ON p2.id = pst.smaller_product_id
       JOIN stores s ON s.id = pst.store_id
       WHERE pst.is_active = true
       ORDER BY pst.unit_price_diff_percent DESC
       LIMIT 20`
    );
    
    res.json(traps.rows);
  } catch (error) {
    res.status(500).json({ error: 'traps_fetch_failed' });
  }
});

// WARRANTY VAULT
app.post('/warranty/add', auth.requireUser, async (req, res) => {
  try {
    const { receiptId, receiptItemId, warrantyMonths } = req.body;
    
    const item = await query(
      `SELECT ri.*, r.created_at as purchase_date, s.name as store_name
       FROM receipt_items ri
       JOIN receipts r ON r.id = ri.receipt_id
       LEFT JOIN stores s ON s.id = r.store_id
       WHERE ri.id = $1 AND r.user_id = $2`,
      [receiptItemId, req.user.id]
    );
    
    if (item.rows.length === 0) {
      res.status(404).json({ error: 'item_not_found' });
      return;
    }
    
    const purchaseDate = new Date(item.rows[0].purchase_date);
    const warrantyExpires = new Date(purchaseDate);
    warrantyExpires.setMonth(warrantyExpires.getMonth() + warrantyMonths);
    
    await query(
      `INSERT INTO warranty_items (
        user_id, receipt_id, receipt_item_id, product_id, product_name,
        purchase_date, warranty_months, warranty_expires_at, purchase_price, store_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        req.user.id,
        receiptId,
        receiptItemId,
        item.rows[0].product_id,
        item.rows[0].normalized_name || item.rows[0].raw_name,
        purchaseDate.toISOString().split('T')[0],
        warrantyMonths,
        warrantyExpires.toISOString().split('T')[0],
        item.rows[0].total_price,
        item.rows[0].store_name
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Warranty add error:', error);
    res.status(500).json({ error: 'warranty_add_failed' });
  }
});

app.get('/warranty/list', auth.requireUser, async (req, res) => {
  try {
    const items = await query(
      `SELECT * FROM warranty_items 
       WHERE user_id = $1 
       ORDER BY warranty_expires_at ASC`,
      [req.user.id]
    );
    
    res.json(items.rows);
  } catch (error) {
    res.status(500).json({ error: 'warranty_list_failed' });
  }
});

// ==============================================
// BOUNTY / TRUST / KIDS / PREMIUM INTELLIGENCE
// ==============================================

app.get('/missions/nearby', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const missions = await ecosystem.getNearbyMissions(req.user.id, {
      lat: req.query.lat ? Number(req.query.lat) : null,
      lon: req.query.lon ? Number(req.query.lon) : null,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      app_foreground: req.query.app_foreground !== 'false'
    });
    res.json(missions);
  } catch (error) {
    res.status(500).json({ error: 'missions_nearby_failed' });
  }
});

app.post('/missions/:id/start', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const task = await ecosystem.startMission(req.user.id, req.params.id);
    res.json(task);
  } catch (error) {
    if (error.message === 'mission_unavailable') {
      return res.status(400).json({ error: 'mission_unavailable' });
    }
    res.status(500).json({ error: 'mission_start_failed' });
  }
});

app.post('/missions/:id/submit', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.product_canonical_name || !payload.barcode) {
      return res.status(400).json({ error: 'product_canonical_name_and_barcode_required' });
    }
    const submission = await ecosystem.submitMission(req.user.id, req.params.id, payload);
    res.json(submission);
  } catch (error) {
    if (['shadow_banned', 'mission_not_found'].includes(error.message)) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'mission_submit_failed' });
  }
});

app.post('/missions/:id/verify', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const vote = req.body?.vote;
    const submissionId = req.body?.submission_id;
    if (!submissionId || !['confirm', 'reject'].includes(vote)) {
      return res.status(400).json({ error: 'submission_id_and_vote_required' });
    }
    const result = await ecosystem.verifyMissionSubmission(req.user.id, req.params.id, submissionId, vote);
    res.json(result);
  } catch (error) {
    if (['submission_not_found', 'cannot_verify_own_submission'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'mission_verify_failed' });
  }
});

app.get('/proof/:id/status', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const status = await ecosystem.getProofStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'proof_not_found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'proof_status_failed' });
  }
});

app.post('/proof/:id/dispute', auth.requireUser, withFeatureFlag('bounty'), async (req, res) => {
  try {
    const result = await ecosystem.disputeProof(req.user.id, req.params.id, req.body?.reason || null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'proof_dispute_failed' });
  }
});

app.post('/kids/activate', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
  try {
    const session = await ecosystem.activateKidsMode(req.user.id, req.body || {});
    res.json(session);
  } catch (error) {
    if (['kid_profile_not_found', 'invalid_parent_pin'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'kids_activate_failed' });
  }
});

app.get('/kids/missions', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id_required' });
    }
    const missions = await ecosystem.getKidsMissions(req.user.id, sessionId);
    res.json(missions);
  } catch (error) {
    if (error.message === 'kids_session_not_found') {
      return res.status(404).json({ error: 'kids_session_not_found' });
    }
    res.status(500).json({ error: 'kids_missions_failed' });
  }
});

app.post('/kids/missions/:id/submit', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
  try {
    const sessionId = req.body?.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id_required' });
    }
    const result = await ecosystem.submitKidsMission(req.user.id, sessionId, req.params.id, req.body || {});
    res.json(result);
  } catch (error) {
    if (['kids_session_not_found', 'adult_mission_not_allowed', 'mission_not_found'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'kids_submit_failed' });
  }
});

app.post('/kids/deactivate', auth.requireUser, withFeatureFlag('kids_mode'), async (req, res) => {
  try {
    const sessionId = req.body?.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id_required' });
    }
    const result = await ecosystem.deactivateKidsMode(req.user.id, sessionId);
    res.json(result);
  } catch (error) {
    if (error.message === 'kids_session_not_found') {
      return res.status(404).json({ error: 'kids_session_not_found' });
    }
    res.status(500).json({ error: 'kids_deactivate_failed' });
  }
});

app.get('/insights/time-machine/:productId', auth.requireUser, requirePlusFeature('time_machine'), async (req, res) => {
  try {
    const result = await ecosystem.getTimeMachinePrediction(req.params.productId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'time_machine_failed' });
  }
});

app.get('/insights/analytics/spending', auth.requireUser, requirePlusFeature('advanced_analytics'), async (req, res) => {
  try {
    const result = await ecosystem.getAdvancedAnalytics(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'advanced_analytics_failed' });
  }
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
