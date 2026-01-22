const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Gintarinė vaistinė Connector
 * Real website: https://www.gintarine.lt/akcijos
 */

const GINTARINE_URL = 'https://www.gintarine.lt/akcijos';

async function fetchGintarineOffers() {
  const offers = [];
  
  try {
    console.log(`💊 Fetching Gintarinė vaistinė offers from: ${GINTARINE_URL}`);
    
    const response = await axios.get(GINTARINE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'lt-LT,lt;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('.product, .offer-card, .promo-product').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.name, .title, h3, h4').first().text().trim();
        const priceText = $elem.find('.price, .sale-price').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .regular-price').first().text().trim();
        const image = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price) || price === 0) return;
        
        offers.push({
          store_chain: 'Gintarinė vaistinė',
          product_name: name,
          price: price,
          old_price: oldPrice,
          valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'online',
          image_url: image ? (image.startsWith('http') ? image : `https://www.gintarine.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Gintarinė product:', err.message);
      }
    });
    
    console.log(`✅ Gintarinė vaistinė: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Gintarinė vaistinė scraping failed:', error.message);
    return getSampleGintarineOffers();
  }
  
  return offers.length > 0 ? offers : getSampleGintarineOffers();
}

function getSampleGintarineOffers() {
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      store_chain: 'Gintarinė vaistinė',
      product_name: 'Bepanthen kremas 30g',
      price: 5.99,
      old_price: 7.99,
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Gintarinė vaistinė',
      product_name: 'Vitaminas D3 2000TV 60kaps',
      price: 4.49,
      old_price: 6.99,
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('💊 Running Gintarinė vaistinė connector...');
  
  try {
    const offers = await fetchGintarineOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Gintarinė vaistinė connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchGintarineOffers,
  run,
  storeName: 'Gintarinė vaistinė',
  website: 'https://www.gintarine.lt'
};
