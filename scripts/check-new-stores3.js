const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const opts = { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'lt-LT,lt;q=0.9' }, timeout: 15000, decompress: true, validateStatus: () => true };

async function probe(url) {
  const r = await axios.get(url, opts);
  const txt = r.data + '';
  const prices = txt.match(/\d+[,.]\d{2}\s*€/g);
  console.log(url.padEnd(55), r.status, txt.length + 'ch', '| prices:', prices ? prices.slice(0,4) : 'none');
  return r;
}

async function main() {
  // === ČIA MARKET - find their offer page ===
  console.log('=== ČIA MARKET ===');
  // Their nav has "Akcijų leidinys" and "Eprekyba"
  const pages = [
    '/akciju-leidinys', '/akciju_leidinys', '/leidinys',
    '/eprekyba', '/parduotuve', '/prekes',
    '/prekyba', '/savaitines-akcijos',
    '/api/offers', '/api/products', '/api/akcijos',
    '/wp-json/wp/v2/posts?categories=', // WP REST API
    '/wp-json/wc/v3/products', // WooCommerce
  ];
  for (const p of pages) {
    await probe('https://www.ciamarket.lt' + p);
    await new Promise(r => setTimeout(r, 200));
  }

  // Check if it's WooCommerce
  const home = await axios.get('https://www.ciamarket.lt/', opts);
  if ((home.data+'').includes('woocommerce') || (home.data+'').includes('WooCommerce')) {
    console.log('\n-> WooCommerce detected!');
  }
  if ((home.data+'').includes('wp-content')) {
    console.log('-> WordPress detected!');
  }

  // === EXPRESS MARKET - more pages ===
  console.log('\n=== EXPRESS MARKET ===');
  const emPages = [
    '/pasiulymai', '/savaitines-akcijos', '/prekes',
    '/kategorija/akcijos', '/product-category/akcijos',
    '/wp-json/wc/v3/products?on_sale=true',
    '/wp-json/wp/v2/posts',
    '/api/products', '/api/offers',
  ];
  for (const p of emPages) {
    await probe('https://www.expressmarket.lt' + p);
    await new Promise(r => setTimeout(r, 200));
  }

  // Check WordPress/WooCommerce
  const emHome = await axios.get('https://www.expressmarket.lt/', opts);
  if ((emHome.data+'').includes('woocommerce')) console.log('-> WooCommerce detected!');
  if ((emHome.data+'').includes('wp-content')) console.log('-> WordPress detected!');

  // Look at their akcijos page more carefully
  console.log('\n--- Express market /akcijos page structure ---');
  const emAk = await axios.get('https://www.expressmarket.lt/akcijos', opts);
  const dem = cheerio.load(emAk.data+'');
  console.log('Title:', dem('title').text());
  // Find all links on the page
  const links = [];
  dem('a[href]').each((_, el) => links.push(dem(el).attr('href') || ''));
  const offerLinks = links.filter(l => l.includes('product') || l.includes('preke') || l.includes('akcij'));
  console.log('Product/offer links:', [...new Set(offerLinks)].slice(0, 10));
}

main().catch(e => console.error('Fatal:', e.message));
