const { query } = require('./db');
const { computeWeightedTruthPrice } = require('./ecosystem-algorithms');

let loyaltyTableEnsured = false;
let receiptFeedbackTableEnsured = false;

async function ensureLoyaltyCardsTable() {
  if (loyaltyTableEnsured) return;
  await query(
    `CREATE TABLE IF NOT EXISTS user_loyalty_cards (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       store_chain text NOT NULL,
       card_label text,
       card_last4 text,
       is_active boolean NOT NULL DEFAULT true,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  await query(`CREATE INDEX IF NOT EXISTS user_loyalty_cards_user_idx ON user_loyalty_cards (user_id, is_active)`);
  await query(`CREATE INDEX IF NOT EXISTS user_loyalty_cards_chain_idx ON user_loyalty_cards (lower(store_chain))`);
  loyaltyTableEnsured = true;
}

async function ensureReceiptFeedbackTable() {
  if (receiptFeedbackTableEnsured) return;
  await query(
    `CREATE TABLE IF NOT EXISTS receipt_scan_feedback (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
       user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       issue_type text NOT NULL DEFAULT 'incorrect_scan',
       details text,
       snapshot jsonb,
       created_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  await query(`CREATE INDEX IF NOT EXISTS receipt_scan_feedback_receipt_idx ON receipt_scan_feedback (receipt_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS receipt_scan_feedback_user_idx ON receipt_scan_feedback (user_id, created_at DESC)`);
  receiptFeedbackTableEnsured = true;
}

async function getStorePins(filters = {}) {
  const { category, verified, maxDistance, lat, lon, cityId } = filters;
  
  let params = [];
  let paramIndex = 1;
  let whereConditions = ['is_active = true'];
  
  // Add city filter
  if (cityId) {
    whereConditions.push(`city_id = $${paramIndex}`);
    params.push(cityId);
    paramIndex++;
  }
  
  // Add category filter
  if (category && category !== 'All') {
    whereConditions.push(`format = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }
  
  const stores = await query(
    `SELECT id, name, chain, lat, lon, format, city_id
     FROM stores
     WHERE ${whereConditions.join(' AND ')}
     ORDER BY name ASC`,
    params
  );

  const storeIds = stores.rows.map((row) => row.id);
  if (!storeIds.length) {
    return [];
  }

  const offers = await query(
    `SELECT o.id,
            o.store_id,
            o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            p.id AS product_id,
            p.name AS product_name
     FROM offers o
     JOIN products p ON p.id = o.product_id
     WHERE o.store_id = ANY($1::uuid[])
       AND o.status = 'active'
     ORDER BY o.store_id, o.price_value ASC`,
    [storeIds]
  );

  const dealsByStore = new Map();
  offers.rows.forEach((row) => {
    const list = dealsByStore.get(row.store_id) || [];
    const oldPrice = row.old_price_value || row.price_value;
    const savings = Number((oldPrice - row.price_value).toFixed(2));
    const percent = oldPrice > 0 ? Number(((savings / oldPrice) * 100).toFixed(1)) : 0;
    list.push({
      product_id: row.product_id,
      product_name: row.product_name,
      price: Number(row.price_value),
      old_price: row.old_price_value ? Number(row.old_price_value) : null,
      source: row.source_type.toUpperCase(),
      valid_to: row.valid_to,
      savings_eur: savings,
      savings_percent: percent,
      verified: row.is_verified
    });
    dealsByStore.set(row.store_id, list);
  });

  return stores.rows.map((store) => ({
    id: store.id,
    name: store.name,
    chain: store.chain,
    lat: Number(store.lat),
    lon: Number(store.lon),
    verified_ratio: 0.0,
    updated_at: new Date().toISOString(),
    top_deals: (dealsByStore.get(store.id) || []).slice(0, 3)
  }));
}

async function getStoreDetail(storeId) {
  const storeResult = await query(
    `SELECT id, name, chain, lat, lon
     FROM stores
     WHERE id = $1`,
    [storeId]
  );

  if (!storeResult.rows.length) {
    return null;
  }

  const offers = await query(
    `SELECT o.id,
            o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            p.id AS product_id,
            p.name AS product_name
     FROM offers o
     JOIN products p ON p.id = o.product_id
     WHERE o.store_id = $1
       AND o.status = 'active'
     ORDER BY o.price_value ASC`,
    [storeId]
  );

  const deals = offers.rows.map((row) => {
    const oldPrice = row.old_price_value || row.price_value;
    const savings = Number((oldPrice - row.price_value).toFixed(2));
    const percent = oldPrice > 0 ? Number(((savings / oldPrice) * 100).toFixed(1)) : 0;
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      price: Number(row.price_value),
      old_price: row.old_price_value ? Number(row.old_price_value) : null,
      source: row.source_type.toUpperCase(),
      valid_to: row.valid_to,
      savings_eur: savings,
      savings_percent: percent,
      verified: row.is_verified
    };
  });

  const store = storeResult.rows[0];
  return {
    store: {
      id: store.id,
      name: store.name,
      chain: store.chain,
      lat: Number(store.lat),
      lon: Number(store.lon),
      verified_ratio: 0.0,
      updated_at: new Date().toISOString(),
      top_deals: deals.slice(0, 3)
    },
    ending_soon: deals.slice(0, 2),
    top_deals: deals.slice(0, 5)
  };
}

async function getCityFeed(cityName) {
  const deals = await query(
    `SELECT o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            p.id AS product_id,
            p.name AS product_name
     FROM offers o
     JOIN products p ON p.id = o.product_id
     JOIN cities c ON c.id = o.city_id
     WHERE c.name = $1 AND o.status = 'active'
     ORDER BY (COALESCE(o.old_price_value, o.price_value) - o.price_value) DESC
     LIMIT 3`,
    [cityName]
  );

  const mapped = deals.rows.map((row) => {
    const oldPrice = row.old_price_value || row.price_value;
    const savings = Number((oldPrice - row.price_value).toFixed(2));
    const percent = oldPrice > 0 ? Number(((savings / oldPrice) * 100).toFixed(1)) : 0;
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      price: Number(row.price_value),
      old_price: row.old_price_value ? Number(row.old_price_value) : null,
      source: row.source_type.toUpperCase(),
      valid_to: row.valid_to,
      savings_eur: savings,
      savings_percent: percent,
      verified: row.is_verified
    };
  });

  return {
    deal_of_day: mapped[0] || null,
    price_shocks: mapped.slice(1),
    new_flyers: mapped.slice(0, 2)
  };
}

async function searchProducts(queryText) {
  const term = `%${queryText}%`;
  const results = await query(
    `SELECT p.id,
            p.name,
            MIN(o.price_value) AS best_price,
            MIN(o.unit_price_value) AS unit_price,
            (ARRAY_AGG(o.source_type ORDER BY o.price_value ASC))[1] AS best_source,
            (ARRAY_AGG(s.chain ORDER BY o.price_value ASC))[1] AS store_chain,
            MAX(o.updated_at) AS updated_at
     FROM products p
     LEFT JOIN offers o ON o.product_id = p.id
     LEFT JOIN stores s ON s.id = o.store_id
     WHERE p.name ILIKE $1
     GROUP BY p.id
     ORDER BY p.name ASC`,
    [term]
  );

  return results.rows.map((row) => ({
    product_id: row.id,
    name: row.name,
    best_price: row.best_price ? Number(row.best_price) : null,
    best_source: row.best_source ? row.best_source.toUpperCase() : null,
    unit_price: row.unit_price ? Number(row.unit_price) : null,
    store_chain: row.store_chain || null,
    updated_at: row.updated_at
  }));
}

async function getProductDetail(productId) {
  const productResult = await query(
    `SELECT id, name, brand
     FROM products
     WHERE id = $1`,
    [productId]
  );

  if (!productResult.rows.length) {
    return null;
  }

  const offers = await query(
    `SELECT o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            p.id AS product_id,
            p.name AS product_name
     FROM offers o
     JOIN products p ON p.id = o.product_id
     WHERE o.product_id = $1
       AND o.status = 'active'
     ORDER BY o.price_value ASC`,
    [productId]
  );

  const deals = offers.rows.map((row) => {
    const oldPrice = row.old_price_value || row.price_value;
    const savings = Number((oldPrice - row.price_value).toFixed(2));
    const percent = oldPrice > 0 ? Number(((savings / oldPrice) * 100).toFixed(1)) : 0;
    return {
      product_id: row.product_id,
      product_name: row.product_name,
      price: Number(row.price_value),
      old_price: row.old_price_value ? Number(row.old_price_value) : null,
      source: row.source_type.toUpperCase(),
      valid_to: row.valid_to,
      savings_eur: savings,
      savings_percent: percent,
      verified: row.is_verified
    };
  });

  const product = productResult.rows[0];
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    unit_price: deals[0] ? deals[0].price : null,
    offers: deals
  };
}

async function createGuestSession(ipHash) {
  const result = await query(
    `INSERT INTO guest_sessions (device_hash, ip_hash, expires_at)
     VALUES ($1, $2, now() + interval '1 day')
     RETURNING id`,
    [ipHash, ipHash]
  );
  return result.rows[0].id;
}

async function createReceipt({ userId = null, guestSessionId = null, storeChain, imageObjectKey }) {
  if (!userId && !guestSessionId) {
    throw new Error('receipt_owner_required');
  }
  if (userId && guestSessionId) {
    throw new Error('receipt_owner_conflict');
  }
  const result = await query(
    `INSERT INTO receipts (user_id, guest_session_id, store_chain, status, image_object_key)
     VALUES ($1, $2, $3, 'processing', $4)
     RETURNING id, status`,
    [userId, guestSessionId, storeChain || null, imageObjectKey]
  );
  return result.rows[0];
}

async function createBasket({ userId = null, guestSessionId = null, name }) {
  if (!userId && !guestSessionId) {
    throw new Error('basket_owner_required');
  }
  if (userId && guestSessionId) {
    throw new Error('basket_owner_conflict');
  }
  const result = await query(
    `INSERT INTO baskets (user_id, guest_session_id, name)
     VALUES ($1, $2, $3)
     RETURNING id, name, status`,
    [userId, guestSessionId, name || 'My basket']
  );
  return result.rows[0];
}

async function findProductByName(rawName) {
  const result = await query(
    `SELECT id, name
     FROM products
     WHERE name ILIKE $1
     ORDER BY name ASC
     LIMIT 1`,
    [`%${rawName}%`]
  );
  return result.rows[0] || null;
}

async function insertBasketItems(basketId, items) {
  if (!items.length) return;
  const values = [];
  const params = [];
  let index = 1;

  items.forEach((item) => {
    values.push(`($${index++}, $${index++}, $${index++}, $${index++})`);
    params.push(
      basketId,
      item.product_id || null,
      item.raw_name || null,
      item.quantity || 1
    );
  });

  await query(
    `INSERT INTO basket_items (basket_id, product_id, raw_name, quantity)
     VALUES ${values.join(', ')}`,
    params
  );
}

async function getBasketItems(basketId) {
  const result = await query(
    `SELECT bi.id,\n            bi.quantity,\n            bi.raw_name,\n            p.id AS product_id,\n            p.name AS product_name\n     FROM basket_items bi\n     LEFT JOIN products p ON p.id = bi.product_id\n     WHERE bi.basket_id = $1\n     ORDER BY bi.created_at ASC`,
    [basketId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    quantity: Number(row.quantity),
    raw_name: row.raw_name,
    product_id: row.product_id,
    product_name: row.product_name || row.raw_name
  }));
}

async function getReceiptStatus(receiptId) {
  const result = await query(
    `SELECT id, status, confidence
     FROM receipts
     WHERE id = $1`,
    [receiptId]
  );
  return result.rows[0] || null;
}

async function getReceiptReport(receiptId) {
  const items = await query(
    `SELECT
       ri.id,
       ri.raw_name,
       ri.total_price,
       ri.confidence,
       ri.match_status,
       ri.candidates,
       ri.matched_product_id,
       p.name AS matched_product_name,
       o.price_value AS best_offer_price,
       o.old_price_value AS best_offer_old_price,
       o.store_chain AS best_offer_store_chain,
       o.valid_to AS best_offer_valid_to
     FROM receipt_items ri
     LEFT JOIN products p ON p.id = ri.matched_product_id
     LEFT JOIN LATERAL (
       SELECT o.price_value, o.old_price_value, o.store_chain, o.valid_to
       FROM offers o
       WHERE o.product_id = ri.matched_product_id
         AND o.status = 'active'
         AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
       ORDER BY o.price_value ASC
       LIMIT 1
     ) o ON true
     WHERE ri.receipt_id = $1
     ORDER BY ri.line_number ASC
     LIMIT 200`,
    [receiptId]
  );

  let savingsTotal = 0;
  let verifiedCount = 0;
  let totalSpent = 0;
  let marketAverageTotal = 0;
  let overpaidVsAverageTotal = 0;
  let savedVsAverageTotal = 0;
  let matchedItems = 0;

  const matchedProductIds = [...new Set(
    items.rows
      .map((row) => row.matched_product_id)
      .filter(Boolean)
  )];

  const truthSourcesByProduct = new Map();
  if (matchedProductIds.length) {
    const truthRows = await query(
      `SELECT product_id, price, source_type, "timestamp", is_verified
       FROM (
         SELECT o.product_id,
                o.price_value AS price,
                o.source_type,
                o.updated_at AS "timestamp",
                o.is_verified,
                ROW_NUMBER() OVER (PARTITION BY o.product_id ORDER BY o.updated_at DESC) AS rn
         FROM offers o
         WHERE o.product_id = ANY($1::uuid[])
           AND o.status = 'active'
       ) ranked
       WHERE rn <= 60`,
      [matchedProductIds]
    );

    for (const row of truthRows.rows) {
      const list = truthSourcesByProduct.get(row.product_id) || [];
      list.push(row);
      truthSourcesByProduct.set(row.product_id, list);
    }
  }

  const mapped = [];
  for (const row of items.rows) {
    const receiptPrice = row.total_price != null ? Number(row.total_price) : null;
    let bestOfferPrice = row.best_offer_price != null ? Number(row.best_offer_price) : null;
    const oldPrice = row.best_offer_old_price != null ? Number(row.best_offer_old_price) : null;
    let avgMarketPrice = null;

    if (row.matched_product_id) {
      const truthSources = truthSourcesByProduct.get(row.matched_product_id) || [];
      const truthPrice = computeWeightedTruthPrice(truthSources);
      if (truthPrice != null) {
        bestOfferPrice = truthPrice;
      }

      const numericPrices = truthSources
        .map((source) => Number(source.price))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (numericPrices.length) {
        const sum = numericPrices.reduce((acc, value) => acc + value, 0);
        avgMarketPrice = Number((sum / numericPrices.length).toFixed(2));
      }
    }

    const hasComparablePrice = receiptPrice != null && bestOfferPrice != null;

    const savings = hasComparablePrice && receiptPrice > bestOfferPrice
      ? Number((receiptPrice - bestOfferPrice).toFixed(2))
      : 0;
    const savingsPercent = hasComparablePrice && receiptPrice > 0
      ? Number((((receiptPrice - bestOfferPrice) / receiptPrice) * 100).toFixed(1))
      : 0;
    const verified = row.match_status === 'matched' && bestOfferPrice != null;

    if (verified) {
      verifiedCount += 1;
    }
    if (savings > 0) {
      savingsTotal += savings;
    }
    if (row.matched_product_id) {
      matchedItems += 1;
    }
    if (receiptPrice != null) {
      totalSpent += receiptPrice;
    }
    if (avgMarketPrice != null) {
      marketAverageTotal += avgMarketPrice;
      if (receiptPrice != null) {
        const delta = Number((receiptPrice - avgMarketPrice).toFixed(2));
        if (delta > 0) {
          overpaidVsAverageTotal += delta;
        } else if (delta < 0) {
          savedVsAverageTotal += Math.abs(delta);
        }
      }
    }

    const deltaVsAverage = receiptPrice != null && avgMarketPrice != null
      ? Number((receiptPrice - avgMarketPrice).toFixed(2))
      : null;
    const comparisonVsAverage = deltaVsAverage == null
      ? 'unknown'
      : deltaVsAverage > 0
        ? 'overpaid'
        : deltaVsAverage < 0
          ? 'saved'
          : 'equal';

    const item = {
      receipt_line_id: row.id,
      product_id: row.matched_product_id || null,
      product_name: row.matched_product_name || row.raw_name,
      receipt_name: row.raw_name,
      match_status: row.match_status || 'unmatched',
      price: receiptPrice,
      best_offer_price: bestOfferPrice,
      average_market_price: avgMarketPrice,
      delta_vs_average: deltaVsAverage,
      comparison_vs_average: comparisonVsAverage,
      old_price: oldPrice,
      store_chain: row.best_offer_store_chain || null,
      source: bestOfferPrice != null ? 'OFFER' : 'RECEIPT',
      valid_to: row.best_offer_valid_to || null,
      savings_eur: savings,
      savings_percent: savingsPercent,
      verified,
      confidence: row.confidence != null ? Number(row.confidence) : null
    };
    if (Array.isArray(row.candidates)) {
      item.candidate_products = row.candidates
        .map((candidate) => ({
          product_id: candidate.product_id || null,
          product_name: candidate.product_name || null,
          score: candidate.score != null ? Number(candidate.score) : null
        }))
        .filter((candidate) => candidate.product_name);
    } else {
      item.candidate_products = [];
    }
    mapped.push(item);
  }

  const verifiedRatio = mapped.length > 0
    ? Number((verifiedCount / mapped.length).toFixed(2))
    : 0;

  return {
    items: mapped,
    savings_total: Number(savingsTotal.toFixed(2)),
    verified_ratio: verifiedRatio,
    summary: {
      total_spent: Number(totalSpent.toFixed(2)),
      market_average_total: Number(marketAverageTotal.toFixed(2)),
      overpaid_vs_average_total: Number(overpaidVsAverageTotal.toFixed(2)),
      saved_vs_average_total: Number(savedVsAverageTotal.toFixed(2)),
      matched_items: matchedItems,
      total_items: mapped.length
    }
  };
}

async function getUserReceiptsAnalytics(userId, options = {}) {
  const months = Math.max(1, Math.min(24, Number(options.months || 12)));

  const itemsResult = await query(
    `SELECT ri.receipt_id,
            ri.total_price,
            ri.matched_product_id,
            r.store_chain,
            r.created_at
     FROM receipt_items ri
     JOIN receipts r ON r.id = ri.receipt_id
     WHERE r.user_id = $1
       AND r.created_at >= NOW() - ($2::int * INTERVAL '1 month')
       AND r.status IN ('processed', 'finalized', 'needs_confirmation')
       AND ri.total_price IS NOT NULL
     ORDER BY r.created_at DESC`,
    [userId, months]
  );

  if (!itemsResult.rows.length) {
    return {
      totals: {
        spent: 0,
        overpaid_vs_average: 0,
        saved_vs_average: 0,
        market_average_total: 0
      },
      monthly: [],
      by_store_chain: [],
      receipts_count: 0
    };
  }

  const uniqueProductIds = [...new Set(
    itemsResult.rows
      .map((row) => row.matched_product_id)
      .filter(Boolean)
  )];

  const avgByProduct = new Map();
  if (uniqueProductIds.length) {
    const avgResult = await query(
      `SELECT product_id,
              AVG(price_value)::numeric(10,4) AS avg_price
       FROM offers
       WHERE product_id = ANY($1::uuid[])
         AND status = 'active'
       GROUP BY product_id`,
      [uniqueProductIds]
    );
    avgResult.rows.forEach((row) => {
      const avg = Number(row.avg_price);
      if (Number.isFinite(avg) && avg > 0) {
        avgByProduct.set(row.product_id, avg);
      }
    });
  }

  let spent = 0;
  let overpaid = 0;
  let saved = 0;
  let marketAverageTotal = 0;

  const monthlyMap = new Map();
  const storeMap = new Map();
  const receiptSet = new Set();

  for (const row of itemsResult.rows) {
    const lineSpent = Number(row.total_price || 0);
    if (!Number.isFinite(lineSpent)) continue;
    spent += lineSpent;

    const avg = row.matched_product_id ? avgByProduct.get(row.matched_product_id) : null;
    if (avg != null) {
      marketAverageTotal += avg;
      const delta = lineSpent - avg;
      if (delta > 0) overpaid += delta;
      if (delta < 0) saved += Math.abs(delta);
    }

    const monthKey = new Date(row.created_at).toISOString().slice(0, 7);
    const monthStat = monthlyMap.get(monthKey) || { month: monthKey, spent: 0, overpaid_vs_average: 0, saved_vs_average: 0 };
    monthStat.spent += lineSpent;
    if (avg != null) {
      const delta = lineSpent - avg;
      if (delta > 0) monthStat.overpaid_vs_average += delta;
      if (delta < 0) monthStat.saved_vs_average += Math.abs(delta);
    }
    monthlyMap.set(monthKey, monthStat);

    const chainKey = row.store_chain || 'Unknown';
    const storeStat = storeMap.get(chainKey) || { store_chain: chainKey, spent: 0, overpaid_vs_average: 0, saved_vs_average: 0, lines: 0 };
    storeStat.spent += lineSpent;
    if (avg != null) {
      const delta = lineSpent - avg;
      if (delta > 0) storeStat.overpaid_vs_average += delta;
      if (delta < 0) storeStat.saved_vs_average += Math.abs(delta);
    }
    storeStat.lines += 1;
    storeMap.set(chainKey, storeStat);

    receiptSet.add(row.receipt_id);
  }

  const monthly = [...monthlyMap.values()]
    .map((row) => ({
      month: row.month,
      spent: Number(row.spent.toFixed(2)),
      overpaid_vs_average: Number(row.overpaid_vs_average.toFixed(2)),
      saved_vs_average: Number(row.saved_vs_average.toFixed(2))
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const byStoreChain = [...storeMap.values()]
    .map((row) => ({
      ...row,
      spent: Number(row.spent.toFixed(2)),
      overpaid_vs_average: Number(row.overpaid_vs_average.toFixed(2)),
      saved_vs_average: Number(row.saved_vs_average.toFixed(2))
    }))
    .sort((a, b) => b.spent - a.spent);

  return {
    totals: {
      spent: Number(spent.toFixed(2)),
      overpaid_vs_average: Number(overpaid.toFixed(2)),
      saved_vs_average: Number(saved.toFixed(2)),
      market_average_total: Number(marketAverageTotal.toFixed(2))
    },
    monthly,
    by_store_chain: byStoreChain,
    receipts_count: receiptSet.size
  };
}

async function getUserLoyaltyCards(userId) {
  await ensureLoyaltyCardsTable();
  const result = await query(
    `SELECT id, store_chain, card_label, card_last4, is_active, created_at, updated_at
     FROM user_loyalty_cards
     WHERE user_id = $1
       AND is_active = true
     ORDER BY store_chain ASC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserLoyaltyChains(userId) {
  await ensureLoyaltyCardsTable();
  const result = await query(
    `SELECT DISTINCT lower(store_chain) AS chain
     FROM user_loyalty_cards
     WHERE user_id = $1
       AND is_active = true`,
    [userId]
  );
  return result.rows.map((row) => row.chain).filter(Boolean);
}

async function upsertUserLoyaltyCard(userId, payload) {
  await ensureLoyaltyCardsTable();
  const storeChain = String(payload.store_chain || '').trim();
  const cardLabel = payload.card_label ? String(payload.card_label).trim() : null;
  const cardLast4 = payload.card_last4 ? String(payload.card_last4).replace(/[^\d]/g, '').slice(-4) : null;

  const existing = await query(
    `SELECT id
     FROM user_loyalty_cards
     WHERE user_id = $1
       AND lower(store_chain) = lower($2)
       AND coalesce(card_last4, '') = coalesce($3, '')
       AND is_active = true
     LIMIT 1`,
    [userId, storeChain, cardLast4]
  );

  if (existing.rows.length) {
    const updated = await query(
      `UPDATE user_loyalty_cards
       SET card_label = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, store_chain, card_label, card_last4, is_active, created_at, updated_at`,
      [cardLabel, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const inserted = await query(
    `INSERT INTO user_loyalty_cards (user_id, store_chain, card_label, card_last4, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, store_chain, card_label, card_last4, is_active, created_at, updated_at`,
    [userId, storeChain, cardLabel, cardLast4]
  );
  return inserted.rows[0];
}

async function deactivateUserLoyaltyCard(userId, loyaltyCardId) {
  await ensureLoyaltyCardsTable();
  const result = await query(
    `UPDATE user_loyalty_cards
     SET is_active = false,
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND is_active = true
     RETURNING id`,
    [loyaltyCardId, userId]
  );
  return result.rows.length > 0;
}

async function getUserReceiptReviewQueue(userId, limit = 12) {
  await ensureReceiptFeedbackTable();
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Number(limit), 1), 50)
    : 12;
  const result = await query(
    `SELECT
       r.id,
       r.status,
       r.confidence,
       r.store_chain,
       r.total,
       r.updated_at,
       COUNT(f.id)::int AS feedback_count
     FROM receipts r
     LEFT JOIN receipt_scan_feedback f ON f.receipt_id = r.id
     WHERE r.user_id = $1
       AND r.status = 'needs_confirmation'
     GROUP BY r.id
     ORDER BY r.updated_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );
  return result.rows;
}

async function getUserReceiptHistory(userId, limit = 20) {
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Number(limit), 1), 100)
    : 20;
  const result = await query(
    `SELECT id, status, confidence, store_chain, total, created_at, updated_at
     FROM receipts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );
  return result.rows;
}

async function getUserReceiptQualitySummary(userId, options = {}) {
  await ensureReceiptFeedbackTable();
  const days = Number.isFinite(Number(options.days))
    ? Math.min(Math.max(Number(options.days), 7), 365)
    : 90;

  const receiptsResult = await query(
    `SELECT
       COUNT(*)::int AS total_receipts,
       COUNT(*) FILTER (WHERE status = 'needs_confirmation')::int AS needs_confirmation_count,
       COUNT(*) FILTER (WHERE status IN ('processed', 'finalized'))::int AS auto_processed_count,
       COALESCE(AVG(confidence), 0)::numeric(10,4) AS avg_confidence
     FROM receipts
     WHERE user_id = $1
       AND created_at >= NOW() - ($2::int * INTERVAL '1 day')`,
    [userId, days]
  );

  const linesResult = await query(
    `SELECT
       COUNT(*)::int AS total_lines,
       COUNT(*) FILTER (WHERE ri.match_status = 'matched')::int AS matched_lines,
       COUNT(*) FILTER (WHERE ri.match_status = 'candidates')::int AS candidate_lines,
       COUNT(*) FILTER (WHERE ri.match_status = 'unmatched')::int AS unmatched_lines
     FROM receipt_items ri
     JOIN receipts r ON r.id = ri.receipt_id
     WHERE r.user_id = $1
       AND r.created_at >= NOW() - ($2::int * INTERVAL '1 day')`,
    [userId, days]
  );

  const feedbackResult = await query(
    `SELECT COUNT(*)::int AS feedback_count
     FROM receipt_scan_feedback
     WHERE user_id = $1
       AND created_at >= NOW() - ($2::int * INTERVAL '1 day')`,
    [userId, days]
  );

  const chainsResult = await query(
    `SELECT
       COALESCE(store_chain, 'Unknown') AS store_chain,
       COUNT(*)::int AS flagged_receipts
     FROM receipts
     WHERE user_id = $1
       AND status = 'needs_confirmation'
       AND created_at >= NOW() - ($2::int * INTERVAL '1 day')
     GROUP BY COALESCE(store_chain, 'Unknown')
     ORDER BY flagged_receipts DESC, store_chain ASC
     LIMIT 5`,
    [userId, days]
  );

  const rec = receiptsResult.rows[0] || {};
  const lines = linesResult.rows[0] || {};
  const feedback = feedbackResult.rows[0] || {};
  const totalReceipts = Number(rec.total_receipts || 0);
  const needsConfirmation = Number(rec.needs_confirmation_count || 0);
  const autoProcessed = Number(rec.auto_processed_count || 0);
  const avgConfidence = Number(rec.avg_confidence || 0);
  const totalLines = Number(lines.total_lines || 0);
  const matchedLines = Number(lines.matched_lines || 0);
  const candidateLines = Number(lines.candidate_lines || 0);
  const unmatchedLines = Number(lines.unmatched_lines || 0);
  const feedbackCount = Number(feedback.feedback_count || 0);

  return {
    window_days: days,
    totals: {
      receipts: totalReceipts,
      needs_confirmation: needsConfirmation,
      auto_processed: autoProcessed,
      avg_confidence: Number(avgConfidence.toFixed(3)),
      feedback_count: feedbackCount
    },
    lines: {
      total: totalLines,
      matched: matchedLines,
      candidates: candidateLines,
      unmatched: unmatchedLines,
      matched_ratio: totalLines > 0 ? Number((matchedLines / totalLines).toFixed(3)) : 0,
      unresolved_ratio: totalLines > 0 ? Number(((candidateLines + unmatchedLines) / totalLines).toFixed(3)) : 0
    },
    top_flagged_chains: chainsResult.rows
  };
}

async function createReceiptScanFeedback(receiptId, userId, payload = {}) {
  await ensureReceiptFeedbackTable();
  const issueType = String(payload.issue_type || 'incorrect_scan').trim().slice(0, 64) || 'incorrect_scan';
  const details = payload.details ? String(payload.details).trim().slice(0, 1000) : null;
  const snapshot = payload.snapshot || null;
  const result = await query(
    `INSERT INTO receipt_scan_feedback (receipt_id, user_id, issue_type, details, snapshot)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, receipt_id, user_id, issue_type, details, created_at`,
    [receiptId, userId, issueType, details, snapshot]
  );
  return result.rows[0];
}

module.exports = {
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
  getUserLoyaltyChains,
  createReceiptScanFeedback,
  getUserReceiptReviewQueue,
  getUserReceiptHistory,
  getUserReceiptQualitySummary
};
