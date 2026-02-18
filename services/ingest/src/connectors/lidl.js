/**
 * Lidl Lithuania Connector
 *
 * Three-tier extraction strategy:
 *  1. Try Lidl's structured JSON API endpoint (fastest)
 *  2. Scrape lidl.lt/akcijos HTML for product cards or PDF flyer links
 *  3. If PDF links found → extractOffersFromPdfUrl (pdf-parse → AI gateway)
 *  4. If HTML-only → AI gateway text extraction (callGatewayText)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { extractOffersFromPdfUrl, publishOffers, callGatewayText } = require('../vision-flyer');

const LIDL_BASE = 'https://www.lidl.lt';
const LIDL_AKCIJOS_URL = `${LIDL_BASE}/akcijos`;
// Lidl exposes a JSON API in some regions — try it first
const LIDL_API_URL = 'https://www.lidl.lt/api/offers/weekly';
const STORE_CHAIN = 'Lidl';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'lt-LT,lt;q=0.9'
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function nextWeekStr() { return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }

function parsePrice(raw) {
  if (raw == null) return null;
  const str = typeof raw === 'number' ? String(raw) : raw;
  const val = parseFloat(str.replace(/[^\d,.]/g, '').replace(',', '.'));
  return isNaN(val) || val <= 0 ? null : val;
}

// ── Tier 1: JSON API ─────────────────────────────────────────────────────────

async function tryJsonApi() {
  try {
    const resp = await axios.get(LIDL_API_URL, {
      headers: { ...HEADERS, Accept: 'application/json' },
      timeout: 10000
    });
    const body = resp.data;

    // Flatten whatever array structure the API returns
    const items = Array.isArray(body) ? body
      : Array.isArray(body.offers) ? body.offers
      : Array.isArray(body.products) ? body.products
      : [];

    if (items.length === 0) return null;

    return items.map(item => ({
      product_name: (item.name || item.title || item.productName || '').trim(),
      price: parsePrice(item.price || item.currentPrice || item.salePrice),
      old_price: parsePrice(item.originalPrice || item.regularPrice || item.oldPrice),
      discount_percent: typeof item.discount === 'number' ? item.discount : null,
      valid_from: item.validFrom || item.startDate || todayStr(),
      valid_to: item.validTo || item.endDate || nextWeekStr(),
      category: item.category || item.categoryName || null
    })).filter(o => o.product_name && o.price !== null);
  } catch {
    return null; // API not available — fall through to HTML scraping
  }
}

// ── Tier 2: HTML scraping ────────────────────────────────────────────────────

async function fetchHtml() {
  const resp = await axios.get(LIDL_AKCIJOS_URL, { headers: HEADERS, timeout: 20000 });
  return resp.data;
}

/**
 * Extract PDF flyer links from lidl.lt/akcijos page.
 * Lidl often links to weekly flyer PDFs.
 */
function extractPdfLinks($) {
  const pdfs = [];
  $('a[href$=".pdf"], a[href*="/letak"], a[href*="/flyer"], a[href*="akcijos/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const url = href.startsWith('http') ? href : `${LIDL_BASE}${href}`;
    if (!pdfs.includes(url)) pdfs.push(url);
  });
  return pdfs;
}

/**
 * Parse product cards from Lidl HTML (multiple selector attempts).
 */
function parseLidlHtml(html) {
  const $ = cheerio.load(html);
  const offers = [];

  const selectors = [
    '.product-grid-item',
    '.product-card',
    '.offer-card',
    '.s-product-grid__item',
    '[class*="product-item"]',
    'article.product'
  ];

  for (const sel of selectors) {
    $(sel).each((_, elem) => {
      const $e = $(elem);

      const name = (
        $e.find('.product-grid-item__title, .product-card__title, [class*="product-name"], [class*="title"], h3, h4').first().text() ||
        $e.find('a').first().attr('aria-label') ||
        ''
      ).trim();

      const priceRaw =
        $e.find('.m-price__price, .price-box__price, [class*="price-current"], [class*="price--sale"]').first().text() ||
        $e.find('[data-price], [itemprop="price"]').first().attr('content') ||
        $e.find('[data-price]').first().attr('data-price') || '';

      const oldPriceRaw =
        $e.find('.m-price__rrp, [class*="price-old"], [class*="price-rrp"], s, del').first().text() || '';

      const price = parsePrice(priceRaw);
      if (!name || price === null) return;

      offers.push({
        product_name: name,
        price,
        old_price: parsePrice(oldPriceRaw),
        discount_percent: null,
        valid_from: todayStr(),
        valid_to: nextWeekStr(),
        category: null
      });
    });

    if (offers.length > 0) break;
  }

  return { $, offers };
}

// ── Main run ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('🛒 Running Lidl connector...');

  // Tier 1: JSON API
  const apiOffers = await tryJsonApi();
  if (apiOffers && apiOffers.length > 0) {
    console.log(`✅ Lidl API: ${apiOffers.length} offers`);
    const result = await publishOffers(apiOffers, STORE_CHAIN, LIDL_API_URL);
    return { offers_found: apiOffers.length, offers_published: result.published, errors: result.errors };
  }

  // Tier 2: HTML scraping
  let html;
  try {
    html = await fetchHtml();
  } catch (err) {
    console.error('❌ Lidl HTML fetch failed:', err.message);
    throw err;
  }

  const { $, offers: htmlOffers } = parseLidlHtml(html);

  if (htmlOffers.length > 0) {
    console.log(`✅ Lidl HTML: ${htmlOffers.length} offers`);
    const result = await publishOffers(htmlOffers, STORE_CHAIN, LIDL_AKCIJOS_URL);
    return { offers_found: htmlOffers.length, offers_published: result.published, errors: result.errors };
  }

  // Tier 3a: PDF Vision — look for linked PDFs in the page
  const pdfLinks = extractPdfLinks($);
  if (pdfLinks.length > 0) {
    console.log(`📄 Lidl: Found ${pdfLinks.length} PDF flyer(s), extracting via Vision...`);
    let allOffers = [];
    for (const pdfUrl of pdfLinks.slice(0, 3)) { // max 3 PDFs
      const pdfOffers = await extractOffersFromPdfUrl(pdfUrl, STORE_CHAIN);
      allOffers = allOffers.concat(pdfOffers);
    }
    if (allOffers.length > 0) {
      console.log(`✅ Lidl PDF Vision: ${allOffers.length} offers`);
      const result = await publishOffers(allOffers, STORE_CHAIN, LIDL_AKCIJOS_URL);
      return { offers_found: allOffers.length, offers_published: result.published, errors: result.errors };
    }
  }

  // Tier 3b: AI text extraction from page text
  console.log('⚠️  Lidl falling back to AI page-text extraction');
  $('script, style, nav, header, footer').remove();
  const pageText = $.text().replace(/\s{3,}/g, '\n').trim().slice(0, 12000);

  if (pageText.length > 200) {
    try {
      const aiOffers = await callGatewayText(pageText, STORE_CHAIN);
      if (aiOffers.length > 0) {
        console.log(`✅ Lidl AI text: ${aiOffers.length} offers`);
        const result = await publishOffers(aiOffers, STORE_CHAIN, LIDL_AKCIJOS_URL);
        return { offers_found: aiOffers.length, offers_published: result.published, errors: result.errors };
      }
    } catch (err) {
      console.warn('Lidl AI text fallback failed:', err.message);
    }
  }

  console.warn('⚠️  Lidl: 0 offers extracted after all tiers');
  return { offers_found: 0, offers_published: 0, errors: 0 };
}

module.exports = { run, storeName: STORE_CHAIN, website: LIDL_BASE };
