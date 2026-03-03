const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const opts = { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'lt-LT,lt;q=0.9' }, timeout: 15000, decompress: true };

async function main() {
  // === EXPRESS MARKET - find price context ===
  console.log('=== EXPRESS MARKET - price structure ===');
  const html = fs.readFileSync('/tmp/express.html', 'utf8');
  const priceIdx = html.indexOf('0,49 €');
  if (priceIdx > -1) {
    console.log('Context around 0,49 €:');
    console.log(html.substring(Math.max(0, priceIdx - 600), priceIdx + 200));
  }

  // Also check expressmarket.lt/akcijos
  console.log('\n--- expressmarket.lt/akcijos ---');
  const emAk = await axios.get('https://www.expressmarket.lt/akcijos', opts);
  const demAk = cheerio.load(emAk.data);
  console.log('Title:', demAk('title').text());
  console.log('Size:', emAk.data.length);
  const emAkPrices = emAk.data.match(/\d+[,.]\d{2}\s*€/g);
  console.log('Prices:', emAkPrices ? emAkPrices.slice(0, 10) : 'none');

  // Check for product API
  const apiRefs = emAk.data.match(/['\"](\/api\/[^'\"]{3,80})['\"]|fetch\([^)]{10,80}\)/g);
  if (apiRefs) console.log('API refs:', apiRefs.slice(0, 5));

  // === ČIA MARKET - look at offer/card elements ===
  console.log('\n=== ČIA MARKET - offer/card structure ===');
  const ciaHtml = fs.readFileSync('/tmp/cia.html', 'utf8');
  const cia = cheerio.load(ciaHtml);

  // Check offer elements
  cia('[class*=offer]').slice(0, 5).each((i, el) => {
    const cls = cia(el).attr('class') || '';
    const txt = cia(el).text().replace(/\s+/g, ' ').trim();
    console.log('Offer[' + i + '] class="' + cls.substring(0, 60) + '"');
    console.log('  Text:', txt.substring(0, 200));
  });

  // Check card elements
  console.log('\nCard elements with text:');
  cia('[class*=card]').slice(0, 5).each((i, el) => {
    const cls = cia(el).attr('class') || '';
    const txt = cia(el).text().replace(/\s+/g, ' ').trim();
    if (txt.length > 5) {
      console.log('Card[' + i + '] class="' + cls.substring(0, 60) + '"');
      console.log('  Text:', txt.substring(0, 150));
    }
  });

  // Look for JSON data in script tags
  const scripts = ciaHtml.match(/<script[^>]*>([^<]{50,5000})<\/script>/g);
  if (scripts) {
    scripts.slice(0, 5).forEach((s, i) => {
      if (s.includes('price') || s.includes('kaina') || s.includes('product')) {
        console.log('\nScript[' + i + '] with price/product data:', s.substring(0, 300));
      }
    });
  }

  // Check Čia Market promotions page
  console.log('\n--- Trying ciamarket.lt pages ---');
  const pages = ['/akcijos', '/pasiulymai', '/specialus-pasiulymai', '/nuolaidos', '/savaitines-akcijos'];
  for (const p of pages) {
    const r = await axios.get('https://www.ciamarket.lt' + p, { ...opts, validateStatus: () => true });
    const prices = (r.data+'').match(/\d+[,.]\d{2}\s*€/g);
    console.log(p + ':', r.status, (r.data+'').length + 'ch', '| prices:', prices ? prices.slice(0,3) : 'none');
    await new Promise(res => setTimeout(res, 300));
  }
}

main().catch(e => console.error('Fatal:', e.message));
