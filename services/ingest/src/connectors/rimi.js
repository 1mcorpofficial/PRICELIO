const axios = require('axios');
const { getClient } = require('../db');
const { normalizePrice, normalizeUnit } = require('../normalizer');

const RIMI_API_URL = 'https://www.rimi.lt/api/promotions';

async function fetch() {
  console.log('Fetching Rimi offers...');
  
  // Mock response - real implementation would call Rimi API
  return {
    offers: [
      {
        name: 'Arabica coffee 1kg',
        price: 9.49,
        old_price: 12.99,
        valid_from: '2026-01-20',
        valid_to: '2026-01-27'
      }
    ],
    fetched_at: new Date().toISOString()
  };
}

async function normalize(raw) {
  return raw.offers.map(offer => ({
    product_name: offer.name,
    price_value: normalizePrice(offer.price),
    old_price_value: offer.old_price ? normalizePrice(offer.old_price) : null,
    discount_percent: offer.old_price 
      ? Math.round(((offer.old_price - offer.price) / offer.old_price) * 100)
      : null,
    valid_from: offer.valid_from,
    valid_to: offer.valid_to,
    source_url: RIMI_API_URL
  }));
}

async function publish(offers) {
  console.log(`Publishing ${offers.length} Rimi offers...`);
  
  const client = await getClient();
  let count = 0;

  try {
    await client.query('BEGIN');

    const storesResult = await client.query(
      `SELECT id, city_id FROM stores WHERE chain = 'Rimi' AND is_active = true`
    );

    for (const offer of offers) {
      // Find or create product
      let productResult = await client.query(
        `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [offer.product_name]
      );

      let productId;
      if (productResult.rows.length > 0) {
        productId = productResult.rows[0].id;
      } else {
        const insertResult = await client.query(
          `INSERT INTO products (name, is_active) VALUES ($1, true) RETURNING id`,
          [offer.product_name]
        );
        productId = insertResult.rows[0].id;
      }

      // Insert offers for all Rimi stores
      for (const store of storesResult.rows) {
        await client.query(
          `INSERT INTO offers (
            product_id, source_type, store_id, store_chain, city_id,
            price_value, old_price_value, discount_percent,
            valid_from, valid_to, source_url, status, fetched_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT DO NOTHING`,
          [
            productId, 'flyer', store.id, 'Rimi', store.city_id,
            offer.price_value, offer.old_price_value, offer.discount_percent,
            offer.valid_from, offer.valid_to, offer.source_url, 'active'
          ]
        );
      }

      count++;
    }

    await client.query('COMMIT');
    return { published: count, errors: 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function run() {
  const raw = await fetch();
  const normalized = await normalize(raw);
  const result = await publish(normalized);
  
  return {
    offers_found: raw.offers.length,
    offers_published: result.published,
    errors: result.errors
  };
}

module.exports = { fetch, normalize, publish, run };
