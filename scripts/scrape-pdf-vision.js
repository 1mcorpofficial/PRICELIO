/**
 * PDF Vision scraper for Express Market and Šilas
 * Downloads PDF, converts each page to image with pdftoppm,
 * then uses OpenAI gpt-4o Vision to extract product prices.
 *
 * Usage: node scrape-pdf-vision.js <silas|express>
 */
const { chromium } = require('playwright-core');
const OpenAI = require('openai');
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!', database: 'receiptradar' });
const openai = new OpenAI({ apiKey: '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' });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const CONFIGS = {
  silas: {
    chain: 'Šilas',
    sourceUrl: 'https://www.silas.lt/akcijos',
  },
  express: {
    chain: 'Express Market',
    sourceUrl: 'https://www.expressmarket.lt/akcijos',
  },
};

async function findPdfUrl(pageUrl) {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  try {
    const page = await browser.newPage({ userAgent: UA });
    const pdfUrls = [];
    page.on('response', res => {
      const url = res.url();
      if (url.endsWith('.pdf') || url.includes('.pdf?')) pdfUrls.push(url);
    });
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Try href selectors
    for (const sel of ['a:has-text("Parsisiųsti")', 'a:has-text("Atsisiųsti")', 'a[href$=".pdf"]', 'a[download]']) {
      try {
        const href = await page.$eval(sel, el => el.href || el.getAttribute('href') || '');
        if (href && href.includes('.pdf')) { pdfUrls.push(href); break; }
      } catch {}
    }

    // Extract from HTML
    const html = await page.content();
    const htmlPdfs = html.match(/https?:\/\/[^\s"'<>]+\.pdf[^\s"'<>]*/gi) || [];
    const relPdfs = (html.match(/href="([^"]*\.pdf[^"]*)"/gi) || []).map(m => m.replace(/href=["']([^"']+)["']/, '$1'));

    return [...new Set([...pdfUrls, ...htmlPdfs, ...relPdfs])].filter(u => u.startsWith('http'));
  } finally {
    await browser.close();
  }
}

async function pdfToImages(pdfUrl) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-vision-'));
  const pdfPath = path.join(tmpDir, 'leaflet.pdf');
  const imgPrefix = path.join(tmpDir, 'page');

  try {
    // Download PDF
    console.log('  Downloading PDF...');
    const resp = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': UA },
      timeout: 60000,
    });
    fs.writeFileSync(pdfPath, Buffer.from(resp.data));
    console.log(`  PDF downloaded: ${Math.round(resp.data.byteLength / 1024)} KB`);

    // Convert all pages to JPEG at 200 DPI
    execSync(`pdftoppm -r 200 -jpeg "${pdfPath}" "${imgPrefix}"`, { timeout: 60000 });

    // Read generated images (pdftoppm names them page-01.jpg, page-02.jpg, ...)
    const files = fs.readdirSync(tmpDir)
      .filter(f => f.startsWith('page') && f.endsWith('.jpg'))
      .sort();

    console.log(`  Converted ${files.length} pages`);
    return files.map(f => ({ name: f, buf: fs.readFileSync(path.join(tmpDir, f)) }));
  } finally {
    // Clean up
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  }
}

async function extractOffersFromImage(imgBuffer, chainName, retries = 3) {
  const base64 = imgBuffer.toString('base64');
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
              text: `This is a page from a Lithuanian grocery store promotional leaflet (${chainName}). Extract ALL product offers with their sale prices. Return JSON: {"offers": [{"product_name": "...", "price_value": 1.99, "old_price_value": 2.49}]}. old_price_value is optional (only if crossed-out price visible). Only include items with clear numeric EUR prices. Do NOT invent data. If no products with prices, return {"offers": []}.`,
            },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + base64, detail: 'high' } },
          ],
        }],
        temperature: 0,
      });
      const parsed = JSON.parse(response.choices[0].message.content);
      return parsed.offers || [];
    } catch(e) {
      if (e.status === 429 && attempt < retries - 1) {
        const wait = 5000 + attempt * 5000;
        console.log(`  Rate limited, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.log('  AI error:', e.message.substring(0, 80));
        return [];
      }
    }
  }
  return [];
}

async function saveToDb(offers, chainName, sourceUrl) {
  if (!offers.length) return { saved: 0, skipped: 0 };
  const client = await pool.connect();
  let saved = 0, skipped = 0;
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  try {
    await client.query('BEGIN');
    const storesRes = await client.query(`SELECT id, city_id FROM stores WHERE chain=$1 AND is_active=true`, [chainName]);
    if (!storesRes.rows.length) { await client.query('ROLLBACK'); return { saved: 0, skipped: offers.length }; }
    console.log(`  Using ${storesRes.rows.length} ${chainName} store(s)`);

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
            [pid, store.id, chainName, store.city_id, price, o.old_price_value ? parseFloat(o.old_price_value) : null, today, nextWeek, sourceUrl]
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
  const mode = process.argv[2] || 'silas';
  const config = CONFIGS[mode];
  if (!config) { console.log('Usage: node scrape-pdf-vision.js <silas|express>'); process.exit(1); }

  console.log('🛒 ' + config.chain + ' PDF Vision scraper (gpt-4o)\n');

  console.log('Finding PDF URL from:', config.sourceUrl);
  const pdfUrls = await findPdfUrl(config.sourceUrl);
  console.log('PDF URLs found:', pdfUrls);

  if (!pdfUrls.length) { console.log('No PDF found'); process.exit(1); }
  const pdfUrl = pdfUrls[0];
  console.log('Using PDF:', pdfUrl);

  console.log('Converting PDF pages to images...');
  const pages = await pdfToImages(pdfUrl);
  console.log('Pages to process:', pages.length);

  let allOffers = [];
  for (let i = 0; i < pages.length; i++) {
    console.log(`\nPage ${i + 1}/${pages.length} [${pages[i].name}]:`);
    const offers = await extractOffersFromImage(pages[i].buf, config.chain);
    console.log(`  Found ${offers.length} offers`);
    offers.slice(0, 5).forEach(o => console.log(`    ${o.product_name}: €${o.price_value}`));
    allOffers = allOffers.concat(offers);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Deduplicate by name
  const seen = new Set();
  allOffers = allOffers.filter(o => {
    const key = o.product_name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  console.log(`\n📦 Total unique offers: ${allOffers.length}`);
  const result = await saveToDb(allOffers, config.chain, config.sourceUrl);
  console.log(`✅ Saved: ${result.saved} | Skipped: ${result.skipped}`);

  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`📦 Total DB offers: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
