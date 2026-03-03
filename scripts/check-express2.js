const { chromium } = require('playwright-core');
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  // Try Express Market with domcontentloaded (faster)
  console.log('=== EXPRESS MARKET with Chromium ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  try {
    const page = await browser.newPage({ userAgent: UA, locale: 'lt-LT' });

    // Try akcijos page
    await page.goto('https://www.expressmarket.lt/akcijos', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);
    for (const sel of ['button:has-text("Sutikti")', 'button:has-text("Accept")', '#cookie-btn', '.cookie-ok']) {
      try { await page.click(sel, { timeout: 1000 }); break; } catch {}
    }
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const text = (document.body && document.body.innerText || '');
      const prices = text.match(/\d+[,.]\d{2}\s*€/g);
      // Find product-like elements
      const cards = document.querySelectorAll('[class*="product"],[class*="offer"],[class*="promo"],[class*="special"],[class*="sale"]');
      const cardTexts = [...cards].slice(0, 10).map(el => (el.innerText || '').trim().substring(0, 150));
      return { prices: prices ? prices.slice(0, 20) : [], cardCount: cards.length, cardTexts, text: text.substring(0, 2000) };
    });

    console.log('Akcijos page prices:', result.prices);
    console.log('Product cards:', result.cardCount);
    if (result.cardTexts.length > 0) result.cardTexts.forEach((t, i) => console.log('Card[' + i + ']:', t));
    console.log('Page text:\n', result.text.substring(0, 1000));

    // Also try homepage which had prices
    console.log('\n--- Homepage ---');
    await page.goto('https://www.expressmarket.lt/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const homeResult = await page.evaluate(() => {
      const text = (document.body && document.body.innerText || '');
      const prices = text.match(/\d+[,.]\d{2}\s*€/g);
      const cards = document.querySelectorAll('[class*="product"],[class*="special"],[class*="offer"],[class*="promo"]');
      const cardTexts = [...cards].filter(el => /\d+[,.]\d{2}/.test(el.innerText || '')).slice(0, 10).map(el => (el.innerText || '').trim().substring(0, 200));
      return { prices: prices ? prices.slice(0, 15) : [], cardTexts, text: text.substring(0, 2000) };
    });

    console.log('Homepage prices:', homeResult.prices);
    if (homeResult.cardTexts.length > 0) homeResult.cardTexts.forEach((t, i) => console.log('Promo[' + i + ']:', t));
    console.log('Text:\n', homeResult.text.substring(0, 1000));

  } finally {
    await browser.close();
  }

  // === ČIA MARKET - try to find PDF via WordPress media API ===
  console.log('\n=== ČIA MARKET - WP media search ===');
  const wpPages = [
    'https://www.ciamarket.lt/wp-json/wp/v2/media?mime_type=application/pdf&per_page=5',
    'https://www.ciamarket.lt/wp-json/wp/v2/pages?slug=akciju-leidinys',
    'https://www.ciamarket.lt/wp-content/uploads/', // directory listing?
  ];
  for (const url of wpPages) {
    const r = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 10000, validateStatus: () => true });
    console.log(url.split('/').slice(-2).join('/'), '->', r.status, '|', JSON.stringify(r.data).substring(0, 200));
  }
}

main().catch(e => console.error('Fatal:', e.message));
