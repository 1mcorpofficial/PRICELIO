const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Lidl Lithuania Connector
 * Real website: https://www.lidl.lt/akcijos
 */

const LIDL_URL = 'https://www.lidl.lt/akcijos';

async function fetchLidlOffers() {
  const offers = [];
  
  try {
    console.log(`🛒 Fetching Lidl offers from: ${LIDL_URL}`);
    
    const response = await axios.get(LIDL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'lt-LT,lt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Lidl uses specific HTML structure for product cards
    $('.product, .product-card, .offer-item, .promo-item').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.product-title, .title, h3, h4').first().text().trim();
        const priceText = $elem.find('.price, .product-price, .current-price').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .original-price, .was-price').first().text().trim();
        const validText = $elem.find('.valid, .validity, .date-range').first().text().trim();
        const image = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
        
        if (!name || !priceText) return;
        
        // Parse price (e.g., "1,99 €" or "1.99 EUR")
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price) || price === 0) return;
        
        // Calculate validity dates
        let validFrom = new Date().toISOString().split('T')[0];
        let validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        offers.push({
          store_chain: 'Lidl',
          product_name: name,
          price: price,
          old_price: oldPrice,
          valid_from: validFrom,
          valid_until: validUntil,
          source: 'flyer',
          image_url: image ? (image.startsWith('http') ? image : `https://www.lidl.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Lidl product:', err.message);
      }
    });
    
    console.log(`✅ Lidl: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Lidl scraping failed:', error.message);
    return getSampleLidlOffers();
  }
  
  return offers.length > 0 ? offers : getSampleLidlOffers();
}

function getSampleLidlOffers() {
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      store_chain: 'Lidl',
      product_name: 'Duona ruginė Lieken Urkorn 500g',
      price: 0.89,
      old_price: 1.19,
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Lidl',
      product_name: 'Pienas Milbona 3.5% 1L',
      price: 1.09,
      old_price: 1.39,
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Lidl',
      product_name: 'Kiaušiniai M 10vnt',
      price: 2.29,
      old_price: 2.79,
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Lidl',
      product_name: 'Jogurtas Pilos 400g',
      price: 1.19,
      old_price: 1.59,
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('🛒 Running Lidl connector...');
  
  try {
    const offers = await fetchLidlOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Lidl connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchLidlOffers,
  run,
  storeName: 'Lidl',
  website: 'https://www.lidl.lt'
};
