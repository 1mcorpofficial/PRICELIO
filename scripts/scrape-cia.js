/**
 * Čia Market scraper - uses FlipHTML5 digital leaflet
 * 1. Intercepts webp page image URLs from FlipHTML5 viewer
 * 2. Downloads each page image
 * 3. Sends to OpenAI Vision to extract product names & prices
 */
const { chromium } = require('playwright-core');
const axios = require('axios');
const OpenAI = require('openai');
const { Pool } = require('pg');

const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!', database: 'receiptradar' });
const openai = new OpenAI({ apiKey: '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' });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CHAIN = 'Čia Market';
const SOURCE_URL = 'https://www.ciamarket.lt/akciju-leidinys';

async function getFlipbookImageUrls() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  const largeImages = new Set();
  try {
    // First get the fliphtml5 URL from Čia Market page
    const page0 = await browser.newPage({ userAgent: UA });
    await page0.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page0.waitForTimeout(2000);
    const iframes = await page0.$$('iframe');
    let flipUrl = 'https://online.fliphtml5.com/xntmg/dpdc/'; // fallback
    for (const iframe of iframes) {
      const src = await iframe.getAttribute('src') || '';
      if (src.includes('fliphtml5')) { flipUrl = src.split('#')[0]; break; }
    }
    console.log('FlipHTML5 URL:', flipUrl);
    await page0.close();

    // Now open directly on the fliphtml5 page and intercept images
    const page = await browser.newPage({ userAgent: UA });

    page.on('request', req => {
      const url = req.url();
      if (url.includes('/large/') && (url.includes('.webp') || url.includes('.jpg'))) {
        largeImages.add(url.split('?')[0]);
      }
    });
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('/large/') && (url.includes('.webp') || url.includes('.jpg'))) {
        largeImages.add(url.split('?')[0]);
      }
    });

    await page.goto(flipUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Navigate through all pages by clicking right arrow / next page
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(2000);

    console.log('Large page images found:', largeImages.size);
    return [...largeImages];
  } finally {
    await browser.close();
  }
}

async function extractOffersFromImage(imageUrl, retries = 3) {
  console.log('  Downloading:', imageUrl.split('/').pop().substring(0, 30));
  const imgResp = await axios.get(imageUrl, {
    headers: { 'User-Agent': UA, 'Referer': 'https://www.ciamarket.lt/' },
    responseType: 'arraybuffer', timeout: 20000,
  });
  const base64 = Buffer.from(imgResp.data).toString('base64');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This is a page from a Lithuanian grocery store promotional leaflet (Čia Market). Extract ALL product offers with prices. Return a JSON object: {"offers": [{"product_name": "...", "price_value": 1.99, "old_price_value": 2.49}]}. Only include items with clear numeric prices. Do NOT invent data. If no clear products with prices, return {"offers": []}.',
            },
            { type: 'image_url', image_url: { url: 'data:image/webp;base64,' + base64, detail: 'high' } },
          ],
        }],
        temperature: 0,
      });
      const parsed = JSON.parse(response.choices[0].message.content);
      return parsed.offers || [];
    } catch(e) {
      if (e.status === 429 && attempt < retries - 1) {
        const wait = 3000 + attempt * 2000;
        console.log('  Rate limited, waiting ' + wait + 'ms...');
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.log('  AI error:', e.message.substring(0, 80));
        return [];
      }
    }
  }
  return [];
}

async function saveToDb(offers) {
  if (!offers.length) return { saved: 0, skipped: 0 };
  const client = await pool.connect();
  let saved = 0, skipped = 0;
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  try {
    await client.query('BEGIN');
    const storesRes = await client.query(`SELECT id, city_id FROM stores WHERE chain=$1 AND is_active=true`, [CHAIN]);
    if (!storesRes.rows.length) { await client.query('ROLLBACK'); return { saved: 0, skipped: offers.length }; }
    console.log(`  Using ${storesRes.rows.length} ${CHAIN} store(s)`);

    for (const o of offers) {
      try {
        const price = parseFloat(o.price_value);
        if (!o.product_name || isNaN(price) || price <= 0 || price > 500) { skipped++; continue; }
        const ex = await client.query(`SELECT id FROM products WHERE LOWER(name)=LOWER($1) LIMIT 1`, [o.product_name.trim()]);
        const pid = ex.rows.length
          ? ex.rows[0].id
          : (await client.query(`INSERT INTO products(name,is_active) VALUES($1,true) RETURNING id`, [o.product_name.trim()])).rows[0].id;

        for (const store of storesRes.rows) {
          await client.query(
            `INSERT INTO offers(product_id,source_type,store_id,store_chain,city_id,price_value,old_price_value,valid_from,valid_to,source_url,status,fetched_at)
             VALUES($1,'online',$2,$3,$4,$5,$6,$7,$8,$9,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31'))
             DO UPDATE SET price_value=$5, old_price_value=$6, fetched_at=NOW(), status='active'`,
            [pid, store.id, CHAIN, store.city_id, price, o.old_price_value ? parseFloat(o.old_price_value) : null, today, nextWeek, SOURCE_URL]
          );
        }
        saved++;
      } catch(e) { skipped++; }
    }
    await client.query('COMMIT');
    return { saved, skipped };
  } catch(e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function main() {
  console.log('🛒 Čia Market FlipHTML5 scraper\n');

  const imageUrls = await getFlipbookImageUrls();
  console.log(`\nFound ${imageUrls.length} leaflet page images`);

  if (!imageUrls.length) {
    console.log('No images found - may need to update FlipHTML5 URL');
    process.exit(1);
  }

  let allOffers = [];
  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`\nPage ${i + 1}/${imageUrls.length}:`);
    const offers = await extractOffersFromImage(imageUrls[i]);
    console.log(`  Found ${offers.length} offers`);
    offers.forEach(o => console.log(`    ${o.product_name}: €${o.price_value}`));
    allOffers = allOffers.concat(offers);
    await new Promise(r => setTimeout(r, 1500)); // avoid rate limits
  }

  // Deduplicate by name
  const seen = new Set();
  allOffers = allOffers.filter(o => {
    const key = o.product_name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  console.log(`\n📦 Total unique offers: ${allOffers.length}`);
  const result = await saveToDb(allOffers);
  console.log(`✅ Saved: ${result.saved} | Skipped: ${result.skipped}`);

  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`📦 Total DB offers: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
