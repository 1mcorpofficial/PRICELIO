const axios = require('axios');
const cheerio = require('cheerio');
const { getClient } = require('../db');
const { normalizePrice, normalizeUnit, parseValidityDates } = require('../normalizer');

const MAXIMA_FLYER_URL = 'https://www.barbora.lt/akcijos';

async function fetch() {
  console.log('Fetching Maxima flyer...');
  
  try {
    const response = await axios.get(MAXIMA_FLYER_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReceiptRadar/1.0)'
      },
      timeout: 15000
    });
    
    return {
      raw_html: response.data,
      url: MAXIMA_FLYER_URL,
      fetched_at: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

async function extract(raw) {
  console.log('Extracting Maxima offers...');
  
  const $ = cheerio.load(raw.raw_html);
  const offers = [];
  
  // This is a mock structure - real implementation would parse actual HTML
  // Each store has different HTML structure, needs custom parsing
  
  // Mock extraction for demonstration
  offers.push({
    product_name: 'Greek yogurt 400g',
    price: 1.19,
    old_price: 1.79,
    unit_price: 2.98,
    unit_price_unit: 'kg',
    valid_from: '2026-01-20',
    valid_to: '2026-01-26',
    image_url: null,
    category: 'Dairy',
    raw_data: {}
  });
  
  return {
    offers,
    count: offers.length,
    extracted_at: new Date().toISOString()
  };
}

async function normalize(extracted) {
  console.log('Normalizing Maxima offers...');
  
  const normalized = extracted.offers.map(offer => {
    const price = normalizePrice(offer.price);
    const oldPrice = offer.old_price ? normalizePrice(offer.old_price) : null;
    const discount = oldPrice && price 
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null;

    return {
      product_name: offer.product_name.trim(),
      price_value: price,
      old_price_value: oldPrice,
      discount_percent: discount,
      unit_price_value: offer.unit_price || null,
      unit_price_unit: normalizeUnit(offer.unit_price_unit),
      valid_from: offer.valid_from,
      valid_to: offer.valid_to,
      source_url: MAXIMA_FLYER_URL,
      source_pointer: {
        original_data: offer.raw_data
      },
      category: offer.category
    };
  });

  return normalized;
}

async function publish(offers) {
  console.log(`Publishing ${offers.length} Maxima offers...`);
  
  const client = await getClient();
  let publishedCount = 0;
  let errorCount = 0;

  try {
    await client.query('BEGIN');

    for (const offer of offers) {
      try {
        // Find or create product
        let product = await findOrCreateProduct(client, offer.product_name, offer.category);
        
        if (!product) {
          console.warn(`Failed to find/create product: ${offer.product_name}`);
          errorCount++;
          continue;
        }

        // Find Maxima stores in DB
        const storesResult = await client.query(
          `SELECT id, city_id FROM stores WHERE chain = 'Maxima' AND is_active = true`
        );

        if (storesResult.rows.length === 0) {
          console.warn('No Maxima stores found in database');
          errorCount++;
          continue;
        }

        // Insert offer for each store
        for (const store of storesResult.rows) {
          await client.query(
            `INSERT INTO offers (
              product_id, source_type, store_id, store_chain, city_id,
              price_value, old_price_value, discount_percent,
              unit_price_value, unit_price_unit,
              valid_from, valid_to, source_url, source_pointer,
              status, fetched_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            ON CONFLICT DO NOTHING`,
            [
              product.id, 'flyer', store.id, 'Maxima', store.city_id,
              offer.price_value, offer.old_price_value, offer.discount_percent,
              offer.unit_price_value, offer.unit_price_unit,
              offer.valid_from, offer.valid_to, offer.source_url,
              JSON.stringify(offer.source_pointer), 'active'
            ]
          );
        }

        publishedCount++;
      } catch (error) {
        console.error(`Failed to publish offer: ${offer.product_name}`, error);
        errorCount++;
      }
    }

    await client.query('COMMIT');
    
    return { published: publishedCount, errors: errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function findOrCreateProduct(client, productName, category) {
  // Try to find existing product
  const existingResult = await client.query(
    `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [productName]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0];
  }

  // Find category
  let categoryId = null;
  if (category) {
    const categoryResult = await client.query(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [category]
    );
    if (categoryResult.rows.length > 0) {
      categoryId = categoryResult.rows[0].id;
    }
  }

  // Create new product
  const insertResult = await client.query(
    `INSERT INTO products (name, category_id, is_active)
     VALUES ($1, $2, true)
     RETURNING id`,
    [productName, categoryId]
  );

  return insertResult.rows[0];
}

async function run() {
  try {
    const raw = await fetch();
    const extracted = await extract(raw);
    const normalized = await normalize(extracted);
    const result = await publish(normalized);
    
    return {
      offers_found: extracted.count,
      offers_published: result.published,
      errors: result.errors
    };
  } catch (error) {
    console.error('Maxima connector error:', error);
    throw error;
  }
}

module.exports = {
  fetch,
  extract,
  normalize,
  publish,
  run
};
