const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const { chromium } = require('playwright-core');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const opts = { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br' }, timeout: 15000, decompress: true, validateStatus: () => true };

async function main() {
  // 1. Get Čia Market PDF links
  console.log('=== ČIA MARKET PDF ===');
  const r = await axios.get('https://www.ciamarket.lt/akciju-leidinys', opts);
  const html = r.data + '';

  // Find PDF URLs in the page
  const pdfLinks = html.match(/https?:\/\/[^\s"'<>]+\.pdf/gi) || [];
  // Also find relative links
  const relLinks = html.match(/href="([^"]*\.pdf[^"]*)"/gi) || [];
  console.log('PDF links found:', [...pdfLinks, ...relLinks].slice(0, 5));

  // Try to get the latest PDF URL from the page text
  const $ = cheerio.load(html);
  const pdfHrefs = [];
  $('a[href$=".pdf"]').each((_, el) => pdfHrefs.push($(el).attr('href')));
  $('a[href*=".pdf"]').each((_, el) => pdfHrefs.push($(el).attr('href')));
  console.log('PDF hrefs:', pdfHrefs.slice(0, 5));

  // Try with Chromium to get PDF URLs after JS renders
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto('https://www.ciamarket.lt/akciju-leidinys', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const pdfUrls = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href]')]
        .map(a => a.href)
        .filter(h => h.includes('.pdf'));
      return links;
    });
    console.log('PDF URLs after JS:', pdfUrls.slice(0, 5));

    if (pdfUrls.length > 0) {
      // Download and parse the latest PDF
      console.log('\nDownloading PDF:', pdfUrls[0]);
      const pdfR = await axios.get(pdfUrls[0], { headers: { 'User-Agent': UA }, responseType: 'arraybuffer', timeout: 30000 });
      console.log('PDF size:', pdfR.data.byteLength, 'bytes');
      const data = await pdfParse(Buffer.from(pdfR.data));
      console.log('Pages:', data.numpages, '| Text length:', data.text.length);
      console.log('Text preview:\n', data.text.substring(0, 1000));
      const prices = data.text.match(/\d+[,.]\d{2}|€\s*\d+/g);
      console.log('Prices found:', prices ? prices.slice(0, 20) : 'none');
    }

    // 2. Check eprekyba section
    console.log('\n=== ČIA MARKET EPREKYBA ===');
    await page.goto('https://www.ciamarket.lt/eprekyba', { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);

    const eResult = await page.evaluate(() => {
      const prices = (document.body.innerText || '').match(/\d+[,.]\d{2}\s*€/g);
      const cards = document.querySelectorAll('[class*="product"],[class*="offer"],[class*="card"]');
      return {
        prices: prices ? prices.slice(0, 15) : [],
        cardCount: cards.length,
        text: (document.body.innerText || '').substring(0, 1500),
      };
    });
    console.log('Prices:', eResult.prices);
    console.log('Cards:', eResult.cardCount);
    console.log('Text:', eResult.text.substring(0, 800));
  } finally {
    await browser.close();
  }
}

main().catch(e => console.error('Fatal:', e.message));
