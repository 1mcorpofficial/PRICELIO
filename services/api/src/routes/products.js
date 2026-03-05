const rateLimit = require('express-rate-limit');
const auth = require('../auth');
const { query } = require('../db');
const { searchProducts, getProductDetail, getUserLoyaltyChains } = require('../queries');
const { buildVersionedKey, getJson: getCachedJson, setJson: setCachedJson } = require('../cache');
const { calculateDistance } = require('../helpers/geo');
const { aiSearchIki, aiSearchViaGpt, batchVerifyPrices, saveVerifiedPrice } = require('../helpers/aiSearch');
const { ensurePendingPricesTable } = require('../helpers/adminDb');

const compareIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_COMPARE_IP_MAX || 45),
  keyGenerator: (req) => rateLimit.ipKeyGenerator(req.ip || ''),
  message: { error: 'compare_rate_limit_ip' },
  standardHeaders: true, legacyHeaders: false
});

const compareUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_COMPARE_USER_MAX || 90),
  skip: (req) => !req.user?.id,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: 'compare_rate_limit_user' },
  standardHeaders: true, legacyHeaders: false
});

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }

function applyLoyaltyFlagsToComparePayload(payload, loyaltyChains) {
  if (!loyaltyChains || !loyaltyChains.size) return payload;
  return payload.map((product) => ({
    ...product,
    store_prices: Array.isArray(product.store_prices)
      ? product.store_prices.map((row) => ({ ...row, loyalty_card_available: row.chain ? loyaltyChains.has(String(row.chain).toLowerCase()) : false }))
      : []
  }));
}

function normalizeProductName(name) {
  return name
    .toLowerCase()
    .replace(/(\d+)\s*(litr[aų]?|liter[s]?|lt)\b/gi, '$1l')
    .replace(/(\d+)\s*l\b(?!\w)/gi, '$1l')
    .replace(/(\d+)\s*ml\b/gi, '$1ml')
    .replace(/(\d+)\s*(kilogram[aų]?|kilo)\b/gi, '$1kg')
    .replace(/(\d+)\s*kg\b/gi, '$1kg')
    .replace(/(\d+)\s*(gram[aų]?|gr)\b(?!am)/gi, '$1g')
    .replace(/(\d+)\s*g\b(?!\w)/gi, '$1g')
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = (app) => {
  app.get('/search', async (req, res) => {
    const queryText = (req.query.q || '').toString().trim();
    if (!queryText) return res.json([]);
    try {
      const city = String(req.query.city || '').trim().toLowerCase() || 'all';
      const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
      const cacheKey = await buildVersionedKey('search', [queryText, city, limit]);
      const cached = await getCachedJson(cacheKey, 'search');
      if (cached) return res.json(cached);
      const results = await searchProducts(queryText);
      const payload = results.slice(0, limit);
      await setCachedJson(cacheKey, payload, 3600, 'search');
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: 'search_unavailable' });
    }
  });

  app.get('/products/compare', auth.optionalAuthMiddleware, compareIpLimiter, compareUserLimiter, async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.max(1, Math.min(10, parseInt(req.query.limit, 10) || 5));
      const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
      const lon = req.query.lon != null ? parseFloat(req.query.lon) : null;
      const radiusKm = Math.max(0.5, Math.min(50, parseFloat(req.query.radiusKm) || 2));
      const hasGeo = Number.isFinite(lat) && Number.isFinite(lon);
      if (!q) return res.status(400).json({ error: 'query_required' });

      const cacheKey = await buildVersionedKey('product_compare', [q, hasGeo ? lat.toFixed(5) : 'na', hasGeo ? lon.toFixed(5) : 'na', radiusKm, limit]);
      let basePayload = await getCachedJson(cacheKey, 'product_compare');

      if (!basePayload) {
        const products = await query(
          `SELECT p.id, p.name, p.brand, p.ean FROM products p
           WHERE p.is_active = true AND (p.name ILIKE $1 OR p.ean = $2)
           ORDER BY CASE WHEN lower(p.name) = lower($2) THEN 0 ELSE 1 END, CASE WHEN p.name ILIKE $3 THEN 0 ELSE 1 END, p.name ASC LIMIT $4`,
          [`%${q}%`, q, `${q}%`, limit]
        );

        if (!products.rows.length) { await setCachedJson(cacheKey, [], 3600, 'product_compare'); return res.json([]); }

        const productIds = products.rows.map((p) => p.id);
        const prices = await query(
          `SELECT o.product_id, s.id AS store_id, s.chain, s.name AS store_name, s.lat, s.lon,
                  MIN(o.price_value)::numeric(10,2) AS price, BOOL_OR(o.is_verified) AS verified_any, MAX(o.updated_at) AS updated_at
           FROM offers o JOIN stores s ON s.id = o.store_id
           WHERE o.product_id = ANY($1::uuid[]) AND o.status = 'active' AND s.is_active = true
           GROUP BY o.product_id, s.id, s.chain, s.name ORDER BY o.product_id, MIN(o.price_value) ASC`,
          [productIds]
        );

        const pricesByProduct = new Map();
        prices.rows.forEach((row) => {
          const rowLat = Number(row.lat);
          const rowLon = Number(row.lon);
          const canMeasureDistance = hasGeo && Number.isFinite(rowLat) && Number.isFinite(rowLon);
          const distanceKm = canMeasureDistance ? calculateDistance(lat, lon, rowLat, rowLon) : null;
          const list = pricesByProduct.get(row.product_id) || [];
          list.push({ store_id: row.store_id, chain: row.chain, store_name: row.store_name, lat: Number.isFinite(rowLat) ? rowLat : null, lon: Number.isFinite(rowLon) ? rowLon : null, price: row.price == null ? null : Number(row.price), distance_km: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null, verified: Boolean(row.verified_any), updated_at: row.updated_at });
          pricesByProduct.set(row.product_id, list);
        });

        basePayload = products.rows.map((product) => {
          const allStorePrices = (pricesByProduct.get(product.id) || []).sort((a, b) => (a.price || 0) - (b.price || 0));
          const nearbyStorePrices = hasGeo ? allStorePrices.filter((row) => row.distance_km != null && row.distance_km <= radiusKm) : allStorePrices;
          const bestNearby = nearbyStorePrices.length ? nearbyStorePrices[0] : null;
          return {
            product_id: product.id, name: product.name, brand: product.brand || null, ean: product.ean || null,
            best_price: allStorePrices.length ? allStorePrices[0].price : null,
            best_nearby_price: bestNearby ? bestNearby.price : null,
            best_nearby_store: bestNearby ? { store_id: bestNearby.store_id, chain: bestNearby.chain, store_name: bestNearby.store_name, lat: bestNearby.lat, lon: bestNearby.lon, distance_km: bestNearby.distance_km } : null,
            radius_km: hasGeo ? radiusKm : null,
            store_prices: nearbyStorePrices.map((row) => ({ ...row, loyalty_card_available: false }))
          };
        });
        await setCachedJson(cacheKey, basePayload, 3600, 'product_compare');
      }

      if (!req.user?.id) return res.json(basePayload);
      const loyaltyChains = new Set(await getUserLoyaltyChains(req.user.id));
      const payload = applyLoyaltyFlagsToComparePayload(cloneJson(basePayload), loyaltyChains);
      return res.json(payload);
    } catch (error) {
      console.error('Product compare error:', error);
      return res.status(500).json({ error: 'product_compare_unavailable' });
    }
  });

  app.get('/products/autocomplete', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    try {
      const result = await query(
        `SELECT p.id, p.name, MIN(o.price_value) AS best_price, COUNT(DISTINCT s.chain) AS chain_count
         FROM products p
         LEFT JOIN offers o ON o.product_id = p.id AND o.status = 'active'
         LEFT JOIN stores s ON s.id = o.store_id AND s.is_active = true AND s.format IN ('supermarket', 'hypermarket')
         WHERE p.name ILIKE $1 AND p.is_active = true
           AND EXISTS (SELECT 1 FROM offers o2 JOIN stores s2 ON s2.id = o2.store_id WHERE o2.product_id = p.id AND o2.status = 'active' AND s2.is_active = true AND s2.format IN ('supermarket', 'hypermarket'))
         GROUP BY p.id, p.name ORDER BY COUNT(DISTINCT s.chain) DESC, p.name ASC LIMIT 40`,
        [`%${q}%`]
      );

      const groups = new Map();
      for (const row of result.rows) {
        const key = normalizeProductName(row.name);
        const chainCount = Number(row.chain_count || 0);
        if (!groups.has(key)) {
          groups.set(key, { label: row.name, q: row.name, best_price: row.best_price ? Number(row.best_price) : null, chain_count: chainCount, product_ids: [row.id] });
        } else {
          const g = groups.get(key);
          g.product_ids.push(row.id);
          if (chainCount > g.chain_count) { g.chain_count = chainCount; g.label = row.name; }
          if (row.best_price && (!g.best_price || Number(row.best_price) < g.best_price)) g.best_price = Number(row.best_price);
        }
      }
      res.json([...groups.values()].sort((a, b) => b.chain_count - a.chain_count || a.label.localeCompare(b.label)).slice(0, 6));
    } catch {
      res.status(500).json({ error: 'autocomplete_failed' });
    }
  });

  app.get('/products/live-search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'query_required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

    try {
      const result = await query(
        `SELECT s.chain, MIN(o.price_value) AS price, p.name, MAX(o.updated_at) AS updated_at
         FROM products p JOIN offers o ON o.product_id = p.id JOIN stores s ON s.id = o.store_id
         WHERE p.name ILIKE $1 AND o.status = 'active' AND p.is_active = true AND s.is_active = true AND s.format IN ('supermarket', 'hypermarket')
         GROUP BY s.chain, p.name ORDER BY MIN(o.price_value) ASC`,
        [`%${q}%`]
      );
      if (!result.rows.length) { send({ not_found: true }); res.end(); return; }

      const chainMap = new Map();
      for (const row of result.rows) {
        const price = Number(row.price);
        if (!chainMap.has(row.chain) || price < chainMap.get(row.chain).price) {
          chainMap.set(row.chain, { chain: row.chain, price, name: row.name, updated_at: row.updated_at || null });
        }
      }
      const chains = [...chainMap.values()];
      chains.sort(() => Math.random() - 0.5);
      for (const c of chains) {
        if (res.writableEnded) break;
        await new Promise((r) => setTimeout(r, 350 + Math.random() * 1100));
        send({ ...c, done: false });
      }
      if (!res.writableEnded) { send({ done: true, total: chains.length }); res.end(); }
    } catch {
      send({ error: true });
      if (!res.writableEnded) res.end();
    }
  });

  app.get('/products/ai-search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'query_required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

    await ensurePendingPricesTable();
    const gptFound = [];

    await Promise.all([
      (async () => {
        try {
          const result = await aiSearchIki(q);
          if (result && result.price > 0) {
            await query(`INSERT INTO pending_prices (product_name, chain, price, status, verified_price, verified_at) VALUES ($1, 'IKI', $2, 'verified', $2, NOW())`, [result.name || q, result.price]).catch(() => {});
            await saveVerifiedPrice(result.name || q, 'IKI', result.price);
            send({ chain: 'IKI', price: result.price, name: result.name, done: false, verified: true, saved: true });
          }
        } catch (err) { console.error('[ai-search] IKI failed:', err.message?.slice(0, 80)); }
      })(),
      (async () => {
        try {
          const results = await aiSearchViaGpt(['Maxima', 'Rimi', 'Norfa', 'Lidl', 'Aibė'], q);
          for (const r of results) {
            if (!r.chain || !(r.price > 0)) continue;
            const price = Number(r.price);
            const name = r.name || q;
            const pendingRes = await query(`INSERT INTO pending_prices (product_name, chain, price) VALUES ($1, $2, $3) RETURNING id`, [name, r.chain, price]).catch(() => ({ rows: [{ id: null }] }));
            gptFound.push({ chain: r.chain, price, name, pendingId: pendingRes.rows[0]?.id });
            await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 600));
            send({ chain: r.chain, price, name, done: false, verified: false });
          }
        } catch (err) { console.error('[ai-search] GPT search failed:', err.message?.slice(0, 80)); }
      })(),
    ]);

    let verifiedCount = 0;
    if (gptFound.length > 0) {
      try {
        const verifications = await batchVerifyPrices(q, gptFound);
        const verifyMap = new Map(verifications.map((v) => [v.chain, v]));
        await Promise.all(gptFound.map(async (item) => {
          const verdict = verifyMap.get(item.chain);
          const isRealistic = verdict?.realistic === true;
          if (isRealistic && item.pendingId) {
            await query(`UPDATE pending_prices SET status = 'verified', verified_price = $1, verified_at = NOW() WHERE id = $2`, [item.price, item.pendingId]).catch(() => {});
            await saveVerifiedPrice(item.name, item.chain, item.price);
            verifiedCount++;
            send({ chain: item.chain, verified: true, price: item.price, saved: true });
          } else {
            if (item.pendingId) await query(`UPDATE pending_prices SET status = 'rejected' WHERE id = $1`, [item.pendingId]).catch(() => {});
            send({ chain: item.chain, verified: false, rejected: true });
          }
        }));
      } catch (err) { console.error('[ai-search] batch verify failed:', err.message?.slice(0, 80)); }
    }

    send({ done: true, total: gptFound.length, verified_count: verifiedCount });
    if (!res.writableEnded) res.end();
  });

  // Barcode lookup — must be BEFORE /products/:id
  app.get('/products/barcode/:ean', async (req, res) => {
    try {
      const result = await query(`SELECT * FROM products WHERE ean = $1 AND is_active = true LIMIT 1`, [req.params.ean]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'product_fetch_failed' });
    }
  });

  // Price history time-series — must be BEFORE /products/:id
  app.get('/products/history', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ dates: [], series: [] });
    try {
      const cacheKey = `price_history:${q.toLowerCase()}`;
      const cached = await getCachedJson(cacheKey, 'price_history');
      if (cached) return res.json(cached);

      const result = await query(
        `WITH matched AS (
           SELECT DISTINCT p.id FROM products p
           WHERE (to_tsvector('simple', p.name) @@ plainto_tsquery('simple', $1) OR p.name ILIKE '%' || $1 || '%')
           LIMIT 30
         ),
         daily AS (
           SELECT o.store_chain, o.fetched_at::date AS day, MIN(o.price_value) AS price
           FROM offers o JOIN matched m ON m.id = o.product_id WHERE o.status = 'active'
           GROUP BY o.store_chain, o.fetched_at::date
         )
         SELECT store_chain, day::text, price FROM daily ORDER BY day ASC, store_chain`,
        [q]
      );

      if (!result.rows.length) {
        await setCachedJson(cacheKey, { dates: [], series: [] }, 900, 'price_history');
        return res.json({ dates: [], series: [] });
      }

      const datesSet = [...new Set(result.rows.map(r => r.day))].sort();
      const chainMap = {};
      for (const row of result.rows) {
        if (!chainMap[row.store_chain]) chainMap[row.store_chain] = {};
        chainMap[row.store_chain][row.day] = parseFloat(row.price);
      }
      const series = Object.entries(chainMap).map(([chain, byDate]) => ({
        chain, prices: datesSet.map(d => byDate[d] ?? null),
      }));
      series.sort((a, b) => {
        const aLast = a.prices.filter(Boolean).at(-1) ?? 9999;
        const bLast = b.prices.filter(Boolean).at(-1) ?? 9999;
        return aLast - bLast;
      });

      const payload = { dates: datesSet, series };
      await setCachedJson(cacheKey, payload, 900, 'price_history');
      res.json(payload);
    } catch (error) {
      console.error('Price history error:', error);
      res.status(500).json({ error: 'price_history_failed' });
    }
  });

  app.get('/products/:id', async (req, res) => {
    try {
      const detail = await getProductDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: 'product_not_found' });
      res.json(detail);
    } catch (error) {
      res.status(500).json({ error: 'product_unavailable' });
    }
  });

  app.get('/products/:id/prices', async (req, res) => {
    try {
      const result = await query(
        `SELECT o.price_value as price, s.name as store_name, s.chain as store, s.lat, s.lon
         FROM offers o JOIN stores s ON s.id = o.store_id
         WHERE o.product_id = $1 AND o.status = 'active' ORDER BY o.price_value ASC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'prices_fetch_failed' });
    }
  });
};
