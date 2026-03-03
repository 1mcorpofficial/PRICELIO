/**
 * Aibė scraper - parses bestOffers-block cards from aibe.lt/akcijos
 * Structure:
 *   .bestOffers-block each card:
 *     .discount-price-now-euro + .discount-price-now-cent = loyalty card price (e.g. "1"+"19" = €1.19)
 *     .discount-without-card-price = non-card price (e.g. "1.29 €")
 *     .bestOffers-block-discountProduct-name = product name
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1', port: 5432,
  user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!',
  database: 'receiptradar',
});

const OFFERS_URL = 'https://www.aibe.lt/akcijos';

function parsePrice(str) {
  if (!str) return null;
  const val = parseFloat(str.replace(/[^\d.]/g, ''));
  return isNaN(val) || val <= 0 ? null : val;
}

async function scrape() {
  const r = await axios.get(OFFERS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'lt-LT,lt;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    timeout: 20000, decompress: true,
  });

  const $ = cheerio.load(r.data);
  const products = [];

  $('.bestOffers-block').each((_, card) => {
    const $card = $(card);

    // Product name
    const name = $card.find('.bestOffers-block-discountProduct-name').text().trim();
    if (!name || name.length < 3) return;

    // Loyalty card (Nario Zona) price: euro + cent parts
    const euroStr = $card.find('.discount-price-now-euro').text().trim();
    const centStr = $card.find('.discount-price-now-cent').text().replace('€', '').trim();
    let loyaltyPrice = null;
    if (euroStr && centStr && /^\d+$/.test(euroStr) && /^\d+$/.test(centStr)) {
      loyaltyPrice = parseFloat(`${euroStr}.${centStr.padStart(2, '0')}`);
    }

    // Non-loyalty card price
    const nonCardPriceStr = $card.find('.discount-without-card-price').text().trim();
    const nonCardPrice = parsePrice(nonCardPriceStr);

    // Use loyalty price as sale price, non-card as "was" price
    const price = loyaltyPrice || nonCardPrice;
    const oldPrice = loyaltyPrice && nonCardPrice && nonCardPrice > loyaltyPrice ? nonCardPrice : null;

    if (price && price > 0) {
      products.push({ name, price, oldPrice });
    }
  });

  return products;
}

async function saveToDb(products) {
  if (!products.length) return { saved: 0, skipped: 0 };
  const client = await pool.connect();
  let saved = 0, skipped = 0;
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  try {
    await client.query('BEGIN');
    const storesRes = await client.query(
      `SELECT id, city_id FROM stores WHERE chain='Aibė' AND is_active=true`
    );
    if (!storesRes.rows.length) {
      console.log('  No Aibė stores in DB');
      await client.query('ROLLBACK');
      return { saved: 0, skipped: products.length };
    }
    console.log(`  Using ${storesRes.rows.length} Aibė store(s)`);

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
             VALUES($1,'online',$2,'Aibė',$3,$4,$5,$6,$7,$8,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31'))
             DO UPDATE SET price_value=$4, old_price_value=$5, fetched_at=NOW(), status='active'`,
            [pid, store.id, store.city_id, p.price, p.oldPrice, today, nextWeek, OFFERS_URL]
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
  console.log('🛒 Aibė scraper\n');
  const products = await scrape();
  console.log(`Extracted ${products.length} products:`);
  products.slice(0, 10).forEach(p => {
    const disc = p.oldPrice ? ` (non-card: €${p.oldPrice})` : '';
    console.log(`  ${p.name}: €${p.price}${disc}`);
  });

  if (!products.length) { console.log('No products'); process.exit(1); }

  const result = await saveToDb(products);
  console.log(`\n✅ Saved: ${result.saved} | Skipped: ${result.skipped}`);

  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`📦 Total active offers in DB: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
