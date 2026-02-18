/**
 * vision-flyer.js
 * PDF / Image → AI Gateway → normalized offers
 *
 * Provides:
 *   extractOffersFromPdfUrl(url, storeName)  – download PDF → extract text → AI
 *   extractOffersFromImageBuffer(buf, storeName) – image buffer → AI
 *   publishOffers(offers, storeChain, sourceUrl, client) – shared DB publish helper
 */

const axios = require('axios');
const pdfParse = require('pdf-parse');
const FormData = require('form-data');
const { getClient } = require('./db');

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:3001';

// ── helpers ────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nextWeekStr() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Call AI gateway with extracted PDF text (cheaper than image Vision).
 * @param {string} text
 * @param {string} storeName
 * @returns {Promise<Array>} raw offers from AI
 */
async function callGatewayText(text, storeName) {
  const resp = await axios.post(
    `${AI_GATEWAY_URL}/extract/flyer`,
    { text, store_name: storeName },
    { timeout: 60000 }
  );
  return resp.data.offers || [];
}

/**
 * Call AI gateway with an image buffer (for image-based PDFs or flyer photos).
 * @param {Buffer} imageBuffer
 * @param {string} storeName
 * @returns {Promise<Array>} raw offers from AI
 */
async function callGatewayImage(imageBuffer, storeName) {
  const form = new FormData();
  form.append('image', imageBuffer, { filename: 'flyer.jpg', contentType: 'image/jpeg' });
  form.append('store_name', storeName);

  const resp = await axios.post(`${AI_GATEWAY_URL}/extract/flyer`, form, {
    headers: form.getHeaders(),
    timeout: 90000
  });
  return resp.data.offers || [];
}

// ── PDF → offers ────────────────────────────────────────────────────────────

/**
 * Download a PDF from url, extract text, send to AI gateway.
 * Falls back to returning [] on any failure.
 * @param {string} url
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
async function extractOffersFromPdfUrl(url, storeName) {
  console.log(`📄 Downloading PDF for ${storeName}: ${url}`);
  let pdfBuffer;
  try {
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pricelio/1.0)' }
    });
    pdfBuffer = Buffer.from(resp.data);
  } catch (err) {
    console.warn(`⚠️  PDF download failed for ${storeName}: ${err.message}`);
    return [];
  }

  let text = '';
  try {
    const parsed = await pdfParse(pdfBuffer);
    text = parsed.text || '';
  } catch (err) {
    console.warn(`⚠️  pdf-parse failed for ${storeName}: ${err.message}`);
  }

  if (text.trim().length > 100) {
    console.log(`📝 PDF text extracted (${text.length} chars), sending to AI gateway`);
    try {
      return await callGatewayText(text, storeName);
    } catch (err) {
      console.warn(`⚠️  AI gateway text extraction failed: ${err.message}`);
      return [];
    }
  }

  // PDF has no embedded text (image-based) — skip Vision here since we need
  // a page renderer (pdftoppm/ImageMagick). Log and return empty.
  console.warn(`⚠️  ${storeName} PDF appears image-based (no text). Vision conversion not available without pdftoppm.`);
  return [];
}

/**
 * Send an image buffer directly to the AI gateway for flyer extraction.
 * @param {Buffer} imageBuffer
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
async function extractOffersFromImageBuffer(imageBuffer, storeName) {
  console.log(`🖼️  Sending image to AI gateway for ${storeName} (${imageBuffer.length} bytes)`);
  try {
    return await callGatewayImage(imageBuffer, storeName);
  } catch (err) {
    console.warn(`⚠️  Image Vision extraction failed for ${storeName}: ${err.message}`);
    return [];
  }
}

// ── Shared DB publish ───────────────────────────────────────────────────────

/**
 * Normalize raw AI offer into DB-ready shape.
 * @param {Object} offer
 * @param {string} storeChain
 * @param {string} sourceUrl
 */
function normalizeAiOffer(offer, storeChain, sourceUrl) {
  const price = typeof offer.price === 'number' ? offer.price : parseFloat(String(offer.price).replace(',', '.'));
  const oldPrice = offer.old_price != null
    ? (typeof offer.old_price === 'number' ? offer.old_price : parseFloat(String(offer.old_price).replace(',', '.')))
    : null;

  const discount = oldPrice && price && !isNaN(oldPrice) && !isNaN(price)
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : (typeof offer.discount_percent === 'number' ? offer.discount_percent : null);

  const productName = [offer.product_name, offer.quantity]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    product_name: productName || 'Unknown',
    price_value: isNaN(price) ? null : price,
    old_price_value: oldPrice && !isNaN(oldPrice) ? oldPrice : null,
    discount_percent: discount,
    valid_from: offer.valid_from || todayStr(),
    valid_to: offer.valid_to || nextWeekStr(),
    source_url: sourceUrl,
    category: offer.category || null
  };
}

/**
 * Persist offers to the DB for all stores of the given chain.
 * Follows the same pattern as maxima.js / rimi.js.
 *
 * @param {Array}  offers      – raw AI offers (from AI gateway)
 * @param {string} storeChain  – 'Lidl' | 'Norfa' | 'Rimi' | 'Iki' | …
 * @param {string} sourceUrl
 * @returns {Promise<{published: number, errors: number}>}
 */
async function publishOffers(offers, storeChain, sourceUrl) {
  const client = await getClient();
  let published = 0;
  let errors = 0;

  try {
    await client.query('BEGIN');

    const storesResult = await client.query(
      `SELECT id, city_id FROM stores WHERE chain = $1 AND is_active = true`,
      [storeChain]
    );

    if (storesResult.rows.length === 0) {
      console.warn(`⚠️  No active stores found for chain "${storeChain}" in DB`);
    }

    for (const rawOffer of offers) {
      try {
        const offer = normalizeAiOffer(rawOffer, storeChain, sourceUrl);
        if (!offer.price_value) { errors++; continue; }

        // Find or create product
        let productId;
        const existing = await client.query(
          `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [offer.product_name]
        );
        if (existing.rows.length > 0) {
          productId = existing.rows[0].id;
        } else {
          // Try to find category id
          let categoryId = null;
          if (offer.category) {
            const catRow = await client.query(
              `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
              [offer.category]
            );
            if (catRow.rows.length > 0) categoryId = catRow.rows[0].id;
          }
          const inserted = await client.query(
            `INSERT INTO products (name, category_id, is_active) VALUES ($1, $2, true) RETURNING id`,
            [offer.product_name, categoryId]
          );
          productId = inserted.rows[0].id;
        }

        // Insert into offers for each store of this chain
        for (const store of storesResult.rows) {
          await client.query(
            `INSERT INTO offers (
              product_id, source_type, store_id, store_chain, city_id,
              price_value, old_price_value, discount_percent,
              valid_from, valid_to, source_url, status, fetched_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
            ON CONFLICT DO NOTHING`,
            [
              productId, 'flyer', store.id, storeChain, store.city_id,
              offer.price_value, offer.old_price_value, offer.discount_percent,
              offer.valid_from, offer.valid_to, sourceUrl, 'active'
            ]
          );
        }

        published++;
      } catch (err) {
        console.error(`Failed to publish offer:`, rawOffer, err.message);
        errors++;
      }
    }

    await client.query('COMMIT');
    return { published, errors };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

module.exports = {
  extractOffersFromPdfUrl,
  extractOffersFromImageBuffer,
  publishOffers,
  callGatewayText,
  callGatewayImage
};
