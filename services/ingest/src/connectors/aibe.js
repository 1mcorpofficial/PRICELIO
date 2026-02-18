/**
 * Aibė Lithuania Connector
 * Scrapes promotional offers from aibe.lt/akcijos
 * Falls back to AI gateway text extraction when CSS parsing yields nothing.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { publishOffers, callGatewayText } = require('../vision-flyer');

const AIBE_URL = 'https://www.aibe.lt/akcijos';
const STORE_CHAIN = 'Aibė';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'lt-LT,lt;q=0.9'
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function nextWeekStr() { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }

function parsePrice(raw) {
  if (!raw) return null;
  const val = parseFloat(raw.replace(/[^\d,.]/g, '').replace(',', '.'));
  return isNaN(val) || val <= 0 ? null : val;
}

function parseAibeHtml(html) {
  const $ = cheerio.load(html);
  const offers = [];

  const selectors = ['.product', '.product-card', '.offer', '.akcija-item', '[class*="product-list"] li'];

  for (const sel of selectors) {
    $(sel).each((_, elem) => {
      const $e = $(elem);
      const name = ($e.find('.product-name, .title, h3, h4').first().text() || '').trim();
      const priceRaw = $e.find('.price, .product-price, .akcija-kaina').first().text();
      const oldPriceRaw = $e.find('.old-price, .sena-kaina, s').first().text();

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
  console.log('🛒 Running Aibė connector...');

  let html;
  try {
    const resp = await axios.get(AIBE_URL, { headers: HEADERS, timeout: 15000 });
    html = resp.data;
  } catch (err) {
    console.error('❌ Aibė fetch failed:', err.message);
    throw err;
  }

  let offers = parseAibeHtml(html);

  if (offers.length === 0) {
    console.log('⚠️  Aibė CSS parse yielded 0 offers — trying AI text extraction');
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

  console.log(`✅ Aibė: ${offers.length} offers extracted`);
  if (offers.length === 0) return { offers_found: 0, offers_published: 0, errors: 0 };

  const result = await publishOffers(offers, STORE_CHAIN, AIBE_URL);
  console.log(`📦 Aibė published ${result.published} offers (${result.errors} errors)`);

  return { offers_found: offers.length, offers_published: result.published, errors: result.errors };
}

module.exports = { run, storeName: STORE_CHAIN, website: 'https://www.aibe.lt' };
