const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const opts = { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'lt-LT,lt;q=0.9' }, timeout: 15000, decompress: true };

async function main() {
  // === EXPRESS MARKET ===
  console.log('=== EXPRESS MARKET ===');
  const em = await axios.get('https://www.expressmarket.lt/', opts);
  fs.writeFileSync('/tmp/express.html', em.data);
  const dem = cheerio.load(em.data);
  const emPrices = em.data.match(/\d+[,.]\d{2}\s*€/g);
  console.log('Prices on homepage:', emPrices ? emPrices.slice(0, 10) : 'none');

  const testSels = ['[class*=product]','[class*=offer]','[class*=promo]','[class*=card]','[class*=item]','article','li[class]'];
  for (const s of testSels) {
    const els = dem(s);
    if (els.length === 0) continue;
    let wp = 0;
    els.each((_, el) => { if (/\d+[,.]\d{2}\s*€/.test(dem(el).text())) wp++; });
    if (wp > 0) {
      console.log(s + ': ' + els.length + ' total, ' + wp + ' with prices');
      els.each((_, el) => {
        if (/\d+[,.]\d{2}\s*€/.test(dem(el).text())) {
          console.log('  Class:', (dem(el).attr('class') || '').substring(0, 80));
          console.log('  Text:', dem(el).text().replace(/\s+/g, ' ').trim().substring(0, 150));
          return false;
        }
      });
    }
  }

  // === ČIA MARKET ===
  console.log('\n=== ČIA MARKET (ciamarket.lt) ===');
  const cm = await axios.get('https://www.ciamarket.lt/', opts);
  fs.writeFileSync('/tmp/cia.html', cm.data);
  const dcm = cheerio.load(cm.data);
  console.log('Title:', dcm('title').text());
  const cmPrices = cm.data.match(/\d+[,.]\d{2}\s*€/g);
  console.log('Prices:', cmPrices ? cmPrices.slice(0, 5) : 'none');
  // Check for React/Vue/Next SPA markers
  if (cm.data.includes('__NEXT_DATA__')) console.log('-> Next.js SSR app');
  if (cm.data.includes('window.__nuxt')) console.log('-> Nuxt.js app');
  if (cm.data.includes('data-reactroot')) console.log('-> React app');
  if (cm.data.includes('data-v-')) console.log('-> Vue.js app');
  // Look for API endpoints
  const apiRefs = cm.data.match(/['\"](\/api\/[^'\"]{3,80})['\"]|['\"](https:\/\/[^'\"]*api[^'\"]{3,80})['\"]|fetch\([^)]{10,80}\)/g);
  if (apiRefs) console.log('API refs:', apiRefs.slice(0, 5));
  // Product cards
  for (const s of testSels) {
    const n = dcm(s).length;
    if (n > 0) console.log('  ' + s + ': ' + n);
  }

  // Also check /pasiulymai and /akcijos
  const cmAk = await axios.get('https://www.ciamarket.lt/pasiulymai', { ...opts, validateStatus: () => true });
  console.log('ciamarket.lt/pasiulymai:', cmAk.status, (cmAk.data+'').length + 'ch');

  // === ŠILAS ===
  console.log('\n=== ŠILAS ===');
  const sl = await axios.get('https://www.silas.lt/', opts);
  const dsl = cheerio.load(sl.data);
  const links = [];
  dsl('a[href]').each((_, el) => {
    const h = dsl(el).attr('href') || '';
    if (h.match(/akcij|pasiuly|promo|special|nuolaid|kain/i)) links.push(h);
  });
  console.log('Offer-related links:', [...new Set(links)].slice(0, 10));

  // Try silas leidinys PDF page
  const slLeid = await axios.get('https://www.silas.lt/akcijos', opts);
  const dslLeid = cheerio.load(slLeid.data);
  // Look for iframe or PDF src
  const iframes = []; dslLeid('iframe').each((_, el) => iframes.push(dslLeid(el).attr('src') || ''));
  const pdfs = slLeid.data.match(/https?:\/\/[^\s"'<>]+\.pdf/gi);
  console.log('Iframes:', iframes.slice(0, 5));
  console.log('PDF links:', pdfs ? pdfs.slice(0, 3) : 'none');
  // Any product JSON in the page?
  const jsonMatch = slLeid.data.match(/\{[^{}]{0,20}"price[^{}]{0,100}\}/g);
  console.log('JSON price objects:', jsonMatch ? jsonMatch.slice(0, 3) : 'none');
}

main().catch(e => console.error('Fatal:', e.message));
