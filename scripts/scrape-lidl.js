/**
 * Lidl.lt scraper - extracts weekly offers from HTML-encoded JSON in page
 * Products are embedded as HTML-entity-encoded JSON in server-rendered Vue.js
 */
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1', port: 5432,
  user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!',
  database: 'receiptradar',
});

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OFFERS_URL = 'https://www.lidl.lt/c/svarbiausios-sios-savaites-akcijos/a10023711';

function decodeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

function extractProducts(html) {
  const products = [];
  const seen = new Set();

  // Strategy: find all productId occurrences, then search backward for title and price
  // Distances: title→productId ~1695 chars, title→price ~310 chars, title→oldPrice ~755 chars
  const PID_MARKER = '&quot;productId&quot;:';
  let idx = 0;

  while (true) {
    const pidIdx = html.indexOf(PID_MARKER, idx);
    if (pidIdx === -1) break;

    // Extract productId value
    const pidEnd = html.indexOf(',', pidIdx + PID_MARKER.length);
    const productId = html.substring(pidIdx + PID_MARKER.length, pidEnd).trim();

    if (!seen.has(productId) && /^\d+$/.test(productId)) {
      seen.add(productId);

      // Search backward (up to 2500 chars) for title and price
      const searchStart = Math.max(0, pidIdx - 2500);
      const block = html.substring(searchStart, pidIdx + 100);

      // Extract title - find last occurrence before productId
      const TITLE_MARKER = '&quot;title&quot;:&quot;';
      const titlePos = block.lastIndexOf(TITLE_MARKER);
      let name = null;
      if (titlePos > -1) {
        const titleStart = titlePos + TITLE_MARKER.length;
        const titleEnd = block.indexOf('&quot;', titleStart);
        if (titleEnd > -1) {
          name = decodeHtml(block.substring(titleStart, titleEnd));
        }
      }

      // Extract price
      const PRICE_MARKER = '&quot;price&quot;:{&quot;price&quot;:';
      const pricePos = block.lastIndexOf(PRICE_MARKER);
      let price = null;
      if (pricePos > -1) {
        const priceStart = pricePos + PRICE_MARKER.length;
        const priceEnd = block.indexOf(',', priceStart);
        price = parseFloat(block.substring(priceStart, priceEnd));
      }

      // Extract oldPrice
      const OLD_MARKER = '&quot;oldPrice&quot;:';
      const oldPos = block.lastIndexOf(OLD_MARKER);
      let oldPrice = null;
      if (oldPos > -1 && oldPos > pricePos) {
        const oldStart = oldPos + OLD_MARKER.length;
        const oldEnd = block.indexOf(',', oldStart);
        const oldVal = parseFloat(block.substring(oldStart, oldEnd));
        if (oldVal > 0 && price && oldVal > price) oldPrice = oldVal;
      }

      // Check havingPrice:true in block
      const hasPrice = block.includes('&quot;havingPrice&quot;:true');

      if (name && price && price > 0 && hasPrice) {
        products.push({ name: name.trim(), price, oldPrice, productId });
      }
    }

    idx = pidIdx + PID_MARKER.length;
  }

  return products;
}

async function saveToDb(products) {
  if (!products.length) return { saved: 0, skipped: 0 };
  const client = await pool.connect();
  let saved = 0, skipped = 0;
  const today = new Date().toISOString().split('T')[0];

  try {
    await client.query('BEGIN');
    const storesRes = await client.query(
      `SELECT id, city_id FROM stores WHERE chain='Lidl' AND is_active=true`
    );
    if (!storesRes.rows.length) {
      console.log('  No Lidl stores found in DB');
      await client.query('ROLLBACK');
      return { saved: 0, skipped: products.length };
    }
    console.log(`  Using ${storesRes.rows.length} Lidl store(s)`);

    for (const p of products) {
      try {
        const ex = await client.query(
          `SELECT id FROM products WHERE LOWER(name)=LOWER($1) LIMIT 1`, [p.name]
        );
        const pid = ex.rows.length
          ? ex.rows[0].id
          : (await client.query(
              `INSERT INTO products(name,is_active) VALUES($1,true) RETURNING id`, [p.name]
            )).rows[0].id;

        for (const store of storesRes.rows) {
          await client.query(
            `INSERT INTO offers(product_id,source_type,store_id,store_chain,city_id,
              price_value,old_price_value,valid_from,valid_to,source_url,status,fetched_at)
             VALUES($1,'online',$2,'Lidl',$3,$4,$5,$6,NULL,$7,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31'))
             DO UPDATE SET price_value=$4, old_price_value=$5, fetched_at=NOW(), status='active'`,
            [pid, store.id, store.city_id, p.price, p.oldPrice, today, OFFERS_URL]
          );
        }
        saved++;
      } catch(e) { skipped++; }
    }

    await client.query('COMMIT');
    return { saved, skipped };
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

async function main() {
  console.log('🛒 Lidl.lt scraper\n');

  const r = await axios.get(OFFERS_URL, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'lt-LT,lt;q=0.9' },
    timeout: 20000,
  });
  console.log(`Fetched ${r.data.length} chars`);

  const products = extractProducts(r.data);
  console.log(`Extracted ${products.length} products:`);
  products.forEach(p => {
    const disc = p.oldPrice ? ` (was €${p.oldPrice})` : '';
    console.log(`  ${p.name}: €${p.price}${disc}`);
  });

  if (!products.length) {
    console.log('No products found - page structure may have changed');
    process.exit(1);
  }

  const result = await saveToDb(products);
  console.log(`\n✅ Saved: ${result.saved} | Skipped: ${result.skipped}`);

  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`📦 Total active offers in DB: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
