const { query } = require('./db');
const { computeWeightedTruthPrice } = require('./ecosystem-algorithms');

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
    whereConditions.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }
  
  const stores = await query(
    `SELECT id, name, chain, lat, lon, category, city_id
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

  const mapped = [];
  for (const row of items.rows) {
    const receiptPrice = row.total_price != null ? Number(row.total_price) : null;
    let bestOfferPrice = row.best_offer_price != null ? Number(row.best_offer_price) : null;
    const oldPrice = row.best_offer_old_price != null ? Number(row.best_offer_old_price) : null;

    if (row.matched_product_id) {
      const truthSources = await query(
        `SELECT o.price_value AS price,
                o.source_type,
                o.updated_at AS timestamp,
                o.is_verified
         FROM offers o
         WHERE o.product_id = $1
           AND o.status = 'active'
         ORDER BY o.updated_at DESC
         LIMIT 60`,
        [row.matched_product_id]
      );
      const truthPrice = computeWeightedTruthPrice(truthSources.rows);
      if (truthPrice != null) {
        bestOfferPrice = truthPrice;
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

    const item = {
      product_id: row.matched_product_id || null,
      product_name: row.matched_product_name || row.raw_name,
      receipt_name: row.raw_name,
      price: receiptPrice,
      best_offer_price: bestOfferPrice,
      old_price: oldPrice,
      store_chain: row.best_offer_store_chain || null,
      source: bestOfferPrice != null ? 'OFFER' : 'RECEIPT',
      valid_to: row.best_offer_valid_to || null,
      savings_eur: savings,
      savings_percent: savingsPercent,
      verified,
      confidence: row.confidence != null ? Number(row.confidence) : null
    };
    mapped.push(item);
  }

  const verifiedRatio = mapped.length > 0
    ? Number((verifiedCount / mapped.length).toFixed(2))
    : 0;

  return {
    items: mapped,
    savings_total: Number(savingsTotal.toFixed(2)),
    verified_ratio: verifiedRatio
  };
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
  getReceiptReport
};
