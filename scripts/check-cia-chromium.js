/**
 * Check Čia Market and Express Market with Chromium
 */
const { chromium } = require('playwright-core');

async function checkStore(url, label) {
  console.log('\n=== ' + label + ' (' + url + ') ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'lt-LT',
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Accept cookies
    for (const sel of ['button:has-text("Sutikti")', 'button:has-text("Leisti")', 'button:has-text("Sutinku")', 'button:has-text("Accept")', '#cookie-accept', '.cookie-accept']) {
      try { await page.click(sel, { timeout: 1500 }); break; } catch {}
    }
    await page.waitForTimeout(2000);

    // Scroll to load lazy content
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(800);
    }

    const result = await page.evaluate(() => {
      const selectors = ['[class*="product-card"]','[class*="offer-card"]','[class*="product-item"]','[class*="offer-item"]','[class*="promo"]','.card[class*="offer"]'];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length >= 2) {
          const items = [...els].map(el => (el.innerText || '').trim()).filter(t => t.length > 5);
          if (items.length >= 2) return { selector: sel, count: els.length, items: items.slice(0, 10) };
        }
      }
      // Fallback: get all text with prices
      const fullText = (document.body && document.body.innerText || '').substring(0, 8000);
      const prices = fullText.match(/\d+[,.]\d{2}\s*€/g);
      return { selector: 'fulltext', count: 0, prices: prices ? prices.slice(0, 20) : [], fullText: fullText.substring(0, 2000) };
    });

    console.log('Found:', result.selector, '| count:', result.count);
    if (result.items) result.items.slice(0, 5).forEach((t, i) => console.log('Item[' + i + ']:', t.substring(0, 120)));
    if (result.prices) console.log('Prices:', result.prices);
    if (result.fullText) console.log('Page text preview:\n', result.fullText.substring(0, 800));

    // Screenshot for debugging
    await page.screenshot({ path: '/tmp/' + label.replace(/\s/g, '_') + '.png', fullPage: false });
    console.log('Screenshot: /tmp/' + label.replace(/\s/g, '_') + '.png');
  } finally {
    await browser.close();
  }
}

async function main() {
  await checkStore('https://www.ciamarket.lt/akciju-leidinys', 'Cia_leidinys');
  await checkStore('https://www.expressmarket.lt/akcijos', 'Express_akcijos');
}

main().catch(e => console.error('Fatal:', e.message));
