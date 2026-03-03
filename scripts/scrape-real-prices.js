/**
 * Real price scraper: uses plain HTTP for server-rendered stores, Chromium for SPAs.
 * Saves real Lithuanian grocery prices to DB.
 */

const { chromium } = require('playwright-core');
const { Pool } = require('pg');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

const pool = new Pool({
  host: '127.0.0.1', port: 5432,
  user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!',
  database: 'receiptradar',
});

const openai = new OpenAI({
  apiKey: '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'
});

const today = new Date().toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'lt-LT,lt;q=0.9,en-US;q=0.5',
};

const COOKIE_SELECTORS = [
  'button:has-text("Sutikti su visais")', 'button:has-text("Leisti viskam")',
  'button:has-text("Sutinku")', 'button:has-text("Priimti visus")',
  'button:has-text("Accept all")', 'button:has-text("Priimti")',
  '#CybotCookiebotDialogBodyButtonAccept', '.js-accept-all',
  '[data-testid="cookie-accept"]', 'button[class*="accept"]',
  'button[class*="Accept"]', 'button[id*="cookie"]', '#cookie-consent-accept',
];

const BROWSER_STORES = [
  { chain: 'Rimi', url: 'https://www.rimi.lt/akcijos', extraWait: 4000 },
];

const HTTP_STORES = [
  { chain: 'Maxima', url: 'https://www.maxima.lt/akcijos', parser: 'maxima' },
  { chain: 'Iki',    url: 'https://www.iki.lt/pasiulymai/akcijos', parser: 'iki' },
  { chain: 'Norfa',  url: 'https://www.norfa.lt/akcijos', parser: 'norfa' },
  { chain: 'Šilas',  url: 'https://www.silas.lt/akcijos', parser: 'generic' },
];

// ─── Iki Parser ────────────────────────────────────────────────────────────────
function parseIki(html) {
  const $ = cheerio.load(html);
  const offers = [];

  $('.promo_bottom').each((_, el) => {
    const card = $(el).closest('div').parent();
    const nameEl = card.find('[class*="promo-top-wrapper"]').first();
    const name = nameEl.text().replace(/\s+/g, ' ').trim();
    const bottomText = $(el).text().replace(/\s+/g, ' ').trim();

    // Parse prices like "3 49" = €3.49, "6 69" = €6.69
    const priceMatches = [...bottomText.matchAll(/(\d+)\s(\d{2})(?!\d)/g)];
    if (!name || priceMatches.length === 0) return;

    const prices = priceMatches.map(m => parseFloat(`${m[1]}.${m[2]}`));
    const currentPrice = Math.min(...prices);
    const oldPrice = prices.length > 1 ? Math.max(...prices) : null;

    if (currentPrice > 0 && currentPrice < 500) {
      offers.push({
        product_name: name.slice(0, 200),
        price_value: currentPrice,
        old_price_value: oldPrice && oldPrice > currentPrice ? oldPrice : null,
      });
    }
  });

  return offers;
}

// ─── Norfa Parser ──────────────────────────────────────────────────────────────
function parseNorfa(html) {
  const $ = cheerio.load(html);
  const offers = [];

  $('[class*="product"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    // Pattern: "-41% 9.99 € 16.99 € Product name Galioja..."
    const priceMatch = text.match(/(\d+[.,]\d{2})\s*€/g);
    const nameMatch = text.match(/€\s*(.+?)(?:Daugiau|Galioja|$)/);

    if (!priceMatch || priceMatch.length === 0) return;

    const prices = priceMatch.map(p => parseFloat(p.replace('€', '').replace(',', '.').trim()));
    const currentPrice = Math.min(...prices);
    const oldPrice = prices.length > 1 ? Math.max(...prices) : null;

    let name = nameMatch ? nameMatch[1].trim() : null;
    if (!name) {
      // Try to get text after the prices
      const textAfterPrices = text.replace(/^.*?€\s*\d+[.,]\d{2}\s*€\s*/, '').trim();
      name = textAfterPrices.split(/Daugiau|Galioja/)[0].trim();
    }

    if (name && name.length > 3 && currentPrice > 0 && currentPrice < 2000) {
      offers.push({
        product_name: name.slice(0, 200),
        price_value: currentPrice,
        old_price_value: oldPrice && oldPrice > currentPrice ? oldPrice : null,
      });
    }
  });

  // Deduplicate by product name
  const seen = new Set();
  return offers.filter(o => {
    if (seen.has(o.product_name)) return false;
    seen.add(o.product_name);
    return true;
  });
}

// ─── Maxima Parser (maxima.lt/akcijos) ────────────────────────────────────────
function parseMaxima(html) {
  const $ = cheerio.load(html);
  const offers = [];
  const seen = new Set();

  $('[class*=offer-card]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length < 10 || seen.has(text.slice(0, 50))) return;
    seen.add(text.slice(0, 50));

    // Price format: "-40 % 1 49 € 2,49 €" → current=1.49, old=2.49
    const newPriceMatch = text.match(/-\d+\s*%\s+(\d+)\s+(\d{2})\s*€/);
    const oldPriceMatch = text.match(/(\d+[,.]\d{2})\s*€\s*$/);
    if (!newPriceMatch) return;

    const currentPrice = parseFloat(newPriceMatch[1] + '.' + newPriceMatch[2]);
    const oldPrice = oldPriceMatch ? parseFloat(oldPriceMatch[1].replace(',', '.')) : null;

    // Name = text before "Iki DD.MM" or "-XX %"
    const nameMatch = text.match(/^(.+?)(?:\s+Iki\s+\d{2}\.\d{2}|\s+-\d+\s*%)/);
    const name = nameMatch ? nameMatch[1].trim() : null;

    if (name && name.length > 2 && currentPrice > 0 && currentPrice < 1000) {
      offers.push({
        product_name: name.slice(0, 200),
        price_value: currentPrice,
        old_price_value: oldPrice && oldPrice > currentPrice ? oldPrice : null,
      });
    }
  });

  return offers;
}

// ─── Generic Parser (uses OpenAI) ─────────────────────────────────────────────
async function parseGenericWithAI(chain, html) {
  const $ = cheerio.load(html);
  ['script', 'style', 'nav', 'footer', 'header'].forEach(s =>
    $(s).remove()
  );
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 14000);
  if (text.length < 100) return [];
  return extractWithAI(chain, text);
}

// ─── HTTP Scraper ──────────────────────────────────────────────────────────────
async function scrapeHttp(store) {
  const { chain, url, parser } = store;
  console.log(`\n📡 [${chain}] HTTP fetch ${url}`);
  try {
    const r = await axios.get(url, { headers: HTTP_HEADERS, timeout: 15000 });
    console.log(`  📄 [${chain}] ${r.data.length} bytes`);

    if (parser === 'maxima') return parseMaxima(r.data);
    if (parser === 'iki') return parseIki(r.data);
    if (parser === 'norfa') return parseNorfa(r.data);
    return parseGenericWithAI(chain, r.data);
  } catch (e) {
    console.error(`  ❌ [${chain}] HTTP error: ${e.message}`);
    return [];
  }
}

// ─── Chromium Scraper ──────────────────────────────────────────────────────────
const PRODUCT_SELECTORS = [
  '[class*="product-card"]', '[class*="product-item"]', '[class*="ProductCard"]',
  '[class*="offer-card"]', '[class*="promo-item"]', '[class*="promo-card"]',
  '[class*="item--product"]', '[data-testid*="product"]', 'article[class*="product"]',
  'li[class*="product"]', '[class*="catalog-item"]',
];

async function scrapeChromium(store) {
  const { chain, url, extraWait } = store;
  console.log(`\n🌐 [${chain}] Chromium ${url}`);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-gpu', '--headless=new', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'lt-LT',
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(extraWait);

    for (const sel of COOKIE_SELECTORS) {
      try { await page.click(sel, { timeout: 600 }); } catch {}
    }
    await page.waitForTimeout(1000);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(900);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const data = await page.evaluate((selectors) => {
      let items = [];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length >= 3) {
          els.forEach(el => {
            const text = (el.innerText || '').trim();
            if (text.length > 5 && text.length < 600) items.push(text);
          });
          if (items.length >= 5) break;
        }
      }
      if (items.length < 3) {
        ['script', 'style', 'nav', 'footer', 'header'].forEach(s =>
          document.querySelectorAll(s).forEach(el => el.remove())
        );
        return { items: [], fullText: (document.body?.innerText || '').slice(0, 25000) };
      }
      return { items: items.slice(0, 100), fullText: '' };
    }, PRODUCT_SELECTORS);

    const content = data.items.length >= 3
      ? data.items.join('\n---ITEM---\n')
      : data.fullText;
    const mode = data.items.length >= 3 ? `${data.items.length} cards` : `text ${content.length}ch`;
    console.log(`  📄 [${chain}] ${mode}`);
    return content;
  } finally {
    await browser.close();
  }
}

// ─── OpenAI Extraction ─────────────────────────────────────────────────────────
async function extractWithAI(chain, content) {
  if (!content || content.length < 100) return [];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract REAL product offers from this ${chain} Lithuanian grocery store page.
Return a JSON object: {"offers": [{"product_name": "...", "price_value": 1.99, "old_price_value": 2.49}]}
Rules:
- Only products with clearly visible numeric prices
- price_value = current sale price in EUR
- old_price_value = crossed-out original price (null if not shown)
- DO NOT invent or guess any data
- If no clear product+price pairs found, return {"offers": []}`
      },
      { role: 'user', content: `${chain} page:\n\n${content.slice(0, 14000)}` }
    ],
    temperature: 0.0,
    max_tokens: 5000,
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.offers || [];
  } catch { return []; }
}

// ─── DB Save ──────────────────────────────────────────────────────────────────
async function saveToDb(offers, chain, sourceUrl) {
  if (!offers.length) return { saved: 0, skipped: 0 };

  const client = await pool.connect();
  let saved = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    const storesRes = await client.query(
      `SELECT id, city_id FROM stores WHERE chain=$1 AND is_active=true`, [chain]
    );
    if (!storesRes.rows.length) {
      console.log(`  ⚠️  [${chain}] No active stores in DB`);
      await client.query('ROLLBACK');
      return { saved: 0, skipped: offers.length };
    }

    for (const o of offers) {
      try {
        const price = parseFloat(o.price_value);
        if (!o.product_name?.trim() || isNaN(price) || price <= 0 || price > 2000) {
          skipped++; continue;
        }

        let pid;
        const existing = await client.query(
          `SELECT id FROM products WHERE LOWER(name)=LOWER($1) LIMIT 1`,
          [o.product_name.trim()]
        );
        pid = existing.rows.length
          ? existing.rows[0].id
          : (await client.query(
              `INSERT INTO products(name,is_active) VALUES($1,true) RETURNING id`,
              [o.product_name.trim()]
            )).rows[0].id;

        for (const store of storesRes.rows) {
          await client.query(
            `INSERT INTO offers(product_id,source_type,store_id,store_chain,city_id,
              price_value,old_price_value,unit_price_value,unit_price_unit,
              valid_from,valid_to,source_url,status,fetched_at)
             VALUES($1,'online',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31'))
             DO UPDATE SET price_value=$5, old_price_value=$6, fetched_at=NOW(), status='active'`,
            [pid, store.id, chain, store.city_id, price,
             o.old_price_value != null ? parseFloat(o.old_price_value) : null,
             null, null, today, nextWeek, sourceUrl]
          );
        }
        saved++;
      } catch (e) { skipped++; }
    }

    await client.query('COMMIT');
    return { saved, skipped };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── Parallel runner ──────────────────────────────────────────────────────────
async function runWithLimit(tasks, limit) {
  let i = 0, total = 0;
  async function next() {
    if (i >= tasks.length) return;
    const task = tasks[i++];
    total += await task();
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, next));
  return total;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 REAL price scraping: HTTP + Chromium + AI\n');

  let totalSaved = 0;

  // 1. HTTP stores (fast, no browser needed)
  console.log('─── HTTP stores (server-rendered) ───');
  for (const store of HTTP_STORES) {
    try {
      const offers = await scrapeHttp(store);
      console.log(`  🔍 [${store.chain}] parsed: ${offers.length} products`);
      if (offers.length > 0) {
        const r = await saveToDb(offers, store.chain, store.url);
        console.log(`  ✅ [${store.chain}] saved: ${r.saved} | skipped: ${r.skipped}`);
        totalSaved += r.saved;
      }
    } catch (e) {
      console.error(`  ❌ [${store.chain}]: ${e.message}`);
    }
  }

  // 2. Browser stores (JS-rendered, run sequentially to avoid rate-limiting)
  console.log('\n─── Chromium stores (JS-rendered) ───');
  for (const store of BROWSER_STORES) {
    try {
      const content = await scrapeChromium(store);
      const offers = await extractWithAI(store.chain, content);
      console.log(`  🔍 [${store.chain}] AI found: ${offers.length} products`);
      if (offers.length > 0) {
        const r = await saveToDb(offers, store.chain, store.url);
        console.log(`  ✅ [${store.chain}] saved: ${r.saved} | skipped: ${r.skipped}`);
        totalSaved += r.saved;
      }
    } catch (e) {
      console.error(`  ❌ [${store.chain}]: ${e.message}`);
    }
    // Pause between browser requests to avoid rate-limiting
    await new Promise(r => setTimeout(r, 3000));
  }

  // Stats
  console.log(`\n✅ Total real offers saved/updated: ${totalSaved}`);
  const stats = await pool.query(
    `SELECT store_chain, COUNT(*) c FROM offers
     WHERE status='active' AND fetched_at > NOW()-INTERVAL '6 hours'
     GROUP BY store_chain ORDER BY c DESC`
  );
  console.log('\n📊 Freshly scraped (last 6h):');
  stats.rows.forEach(r => console.log(`  ${r.store_chain}: ${r.c}`));

  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`\n📦 Total active offers in DB: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
