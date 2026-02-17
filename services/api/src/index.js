require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
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
  getReceiptReport
} = require('./queries');
const { publishReceiptJob } = require('./queue');
const { optimizeSingleStore } = require('./optimizer');
const ecosystem = require('./ecosystem');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
      const defaultCity = (city || 'Vilnius').toString();
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

    await publishReceiptJob({ receipt_id: receipt.id, object_key: objectKey });

    if (userId) {
      await ecosystem.awardPoints(userId, {
        eventType: 'receipt_upload',
        xp: 10,
        points: 10,
        referenceType: 'receipt',
        referenceId: receipt.id
      });
    }

    const hasPriority = userId ? await ecosystem.hasFeature(userId, 'priority_scan') : false;

    res.json({
      receipt_id: receipt.id,
      status: receipt.status,
      progress: statusToProgress(receipt.status),
      processing_priority: hasPriority ? 'priority' : 'standard'
    });
  } catch (error) {
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
      verified_ratio: report.verified_ratio
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
  console.log(`ReceiptRadar API running on port ${port}`);
  console.log('✅ All features enabled:');
  console.log('  - Alerts & Notifications');
  console.log('  - Project Baskets');
  console.log('  - Barcode Scanner');
  console.log('  - ShelfSnap');
  console.log('  - Package Size Traps');
  console.log('  - Warranty Vault');
});
