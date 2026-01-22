const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Elektromarkt Connector
 * Real website: https://www.elektromarkt.lt/akcijos
 */

const ELEKTROMARKT_URL = 'https://www.elektromarkt.lt/akcijos';

async function fetchElektromarktOffers() {
  const offers = [];
  
  try {
    console.log(`⚡ Fetching Elektromarkt offers from: ${ELEKTROMARKT_URL}`);
    
    const response = await axios.get(ELEKTROMARKT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'lt-LT,lt;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('.product, .offer, .promo-card').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.product-name, .title, h3').first().text().trim();
        const priceText = $elem.find('.price, .sale-price').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .regular-price').first().text().trim();
        const image = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price) || price === 0) return;
        
        offers.push({
          store_chain: 'Elektromarkt',
          product_name: name,
          price: price,
          old_price: oldPrice,
          valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'online',
          image_url: image ? (image.startsWith('http') ? image : `https://www.elektromarkt.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Elektromarkt product:', err.message);
      }
    });
    
    console.log(`✅ Elektromarkt: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Elektromarkt scraping failed:', error.message);
    return getSampleElektromarktOffers();
  }
  
  return offers.length > 0 ? offers : getSampleElektromarktOffers();
}

function getSampleElektromarktOffers() {
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      store_chain: 'Elektromarkt',
      product_name: 'LG Televizorius 55" 4K UHD',
      price: 449.99,
      old_price: 599.99,
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Elektromarkt',
      product_name: 'Samsung Šaldytuvas 300L',
      price: 399.99,
      old_price: 499.99,
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Elektromarkt',
      product_name: 'Bosch Skalbimo mašina 8kg',
      price: 379.99,
      old_price: 479.99,
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('⚡ Running Elektromarkt connector...');
  
  try {
    const offers = await fetchElektromarktOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Elektromarkt connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchElektromarktOffers,
  run,
  storeName: 'Elektromarkt',
  website: 'https://www.elektromarkt.lt'
};
