/**
 * Norfa Lithuania Connector
 * Scrapes promotional offers from norfa.lt/akcijos
 * Falls back to AI gateway text extraction when structured parsing yields nothing.
 * Publishes results to DB via shared publishOffers() utility.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { publishOffers, callGatewayText } = require('../vision-flyer');

const NORFA_URL = 'https://www.norfa.lt/akcijos';
const STORE_CHAIN = 'Norfa';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'lt-LT,lt;q=0.9'
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function nextWeekStr() { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }

function parsePrice(raw) {
  if (!raw) return null;
  const val = parseFloat(raw.replace(/[^\d,.]/g, '').replace(',', '.'));
  return isNaN(val) || val <= 0 ? null : val;
}

function parseNorfaHtml(html) {
  const $ = cheerio.load(html);
  const offers = [];

  const selectors = [
    '.product-item',
    '.akcija-item',
    '.offer-card',
    '.product-card',
    '[class*="product-list"] li',
    'article[class*="product"]'
  ];

  for (const sel of selectors) {
    $(sel).each((_, elem) => {
      const $e = $(elem);

      const name = (
        $e.find('.product-name, .title, [class*="name"], h3, h4').first().text() ||
        $e.find('a').first().attr('title') ||
        ''
      ).trim();

      const priceRaw =
        $e.find('.price, .product-price, .akcija-kaina, [class*="price-current"]').first().text() ||
        $e.find('[data-price]').first().attr('data-price') || '';

      const oldPriceRaw =
        $e.find('.old-price, .original-price, .sena-kaina, s, del').first().text() || '';

      const price = parsePrice(priceRaw);
      if (!name || price === null) return;

      const oldPrice = parsePrice(oldPriceRaw);

      offers.push({
        product_name: name,
        price,
        old_price: oldPrice,
        discount_percent: oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null,
        valid_from: todayStr(),
        valid_to: nextWeekStr(),
        category: null
      });
    });

    if (offers.length > 0) break;
  }

  return offers;
}

async function run() {
  console.log('🏪 Running Norfa connector...');

  let html;
  try {
    const resp = await axios.get(NORFA_URL, { headers: HEADERS, timeout: 20000 });
    html = resp.data;
  } catch (err) {
    console.error('❌ Norfa fetch failed:', err.message);
    throw err;
  }

  let offers = parseNorfaHtml(html);

  if (offers.length === 0) {
    console.log('⚠️  Norfa CSS parse yielded 0 offers — trying AI text extraction');
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer').remove();
    const text = $.text().replace(/\s{3,}/g, '\n').trim().slice(0, 12000);

    if (text.length > 200) {
      try {
        const aiOffers = await callGatewayText(text, STORE_CHAIN);
        offers = aiOffers.map(o => ({
          product_name: [o.product_name, o.quantity].filter(Boolean).join(' '),
          price: o.price,
          old_price: o.old_price || null,
          discount_percent: o.discount_percent || null,
          valid_from: o.valid_from || todayStr(),
          valid_to: o.valid_to || nextWeekStr(),
          category: o.category || null
        }));
      } catch (err) {
        console.warn('AI gateway fallback failed:', err.message);
      }
    }
  }

  console.log(`✅ Norfa: ${offers.length} offers extracted`);

  if (offers.length === 0) {
    return { offers_found: 0, offers_published: 0, errors: 0 };
  }

  const result = await publishOffers(offers, STORE_CHAIN, NORFA_URL);
  console.log(`📦 Norfa published ${result.published} offers (${result.errors} errors)`);

  return {
    offers_found: offers.length,
    offers_published: result.published,
    errors: result.errors
  };
}

module.exports = { run, storeName: STORE_CHAIN };
