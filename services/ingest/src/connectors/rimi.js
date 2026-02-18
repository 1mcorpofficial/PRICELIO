/**
 * Rimi Lithuania Connector
 * Scrapes promotional offers from rimi.lt/akcijos
 * Falls back to AI gateway text extraction when structured parsing yields nothing.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { publishOffers, callGatewayText } = require('../vision-flyer');

const RIMI_URL = 'https://www.rimi.lt/akcijos';
const STORE_CHAIN = 'Rimi';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'lt-LT,lt;q=0.9,en-US;q=0.8'
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function nextWeekStr() { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }

/**
 * Parse a Lithuanian price string like "1,99 €" or "2.49" → number.
 */
function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) || val <= 0 ? null : val;
}

/**
 * Try multiple CSS selector patterns — Rimi redesigns often.
 * Returns an array of raw offer objects.
 */
function parseRimiHtml(html) {
  const $ = cheerio.load(html);
  const offers = [];

  // Pattern 1: Rimi product-card structure (2024-2026 design)
  const selectors = [
    '.product-card',
    '.js-product-card',
    '.offer-card',
    'li[data-product-code]',
    'article.product'
  ];

  for (const sel of selectors) {
    $(sel).each((_, elem) => {
      const $e = $(elem);

      const name = (
        $e.find('.product-card__name, .card__name, [class*="product-name"], h3, h4').first().text() ||
        $e.find('a[title]').first().attr('title') ||
        ''
      ).trim();

      const priceRaw =
        $e.find('.price-field__integer, .card__price-current, [class*="price--main"], .current-price').first().text() ||
        $e.find('[data-price]').first().attr('data-price') ||
        '';

      const oldPriceRaw =
        $e.find('.price-field--old, .card__price-old, [class*="price--old"], .old-price, s').first().text() || '';

      const validRaw =
        $e.find('.date-range, .validity, .akcija-period, [class*="date"]').first().text() || '';

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

    if (offers.length > 0) break; // Stop at first selector that worked
  }

  return offers;
}

async function fetch() {
  console.log(`🛒 Fetching Rimi offers from ${RIMI_URL}`);
  const resp = await axios.get(RIMI_URL, { headers: HEADERS, timeout: 20000 });
  return resp.data;
}

async function scrapeOffers(html) {
  let offers = parseRimiHtml(html);

  if (offers.length === 0) {
    // Fallback: extract all visible text and send to AI gateway for structure extraction
    console.log('⚠️  Rimi CSS parse yielded 0 offers — trying AI text extraction');
    const $ = cheerio.load(html);
    // Strip scripts, styles, then get text
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

  return offers;
}

async function run() {
  try {
    const html = await fetch();
    const offers = await scrapeOffers(html);

    console.log(`✅ Rimi: ${offers.length} offers extracted`);

    if (offers.length === 0) {
      return { offers_found: 0, offers_published: 0, errors: 0 };
    }

    const result = await publishOffers(offers, STORE_CHAIN, RIMI_URL);
    console.log(`📦 Rimi published ${result.published} offers (${result.errors} errors)`);

    return {
      offers_found: offers.length,
      offers_published: result.published,
      errors: result.errors
    };
  } catch (error) {
    console.error('❌ Rimi connector failed:', error.message);
    throw error;
  }
}

module.exports = { run, scrapeOffers, storeName: STORE_CHAIN };
