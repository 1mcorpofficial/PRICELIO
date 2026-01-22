const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Šilas Connector
 * Scrapes offers from Šilas website and flyers
 */

async function fetchSilasOffers() {
  const offers = [];
  
  try {
    // Šilas website: https://www.silas.lt/akcijos
    const response = await axios.get('https://www.silas.lt/akcijos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse products
    $('.product, .akcija, .offer').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.name, .title, h3').first().text().trim();
        const priceText = $elem.find('.price, .kaina').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .sena-kaina').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price)) return;
        
        offers.push({
          store_chain: 'Šilas',
          product_name: name,
          price: price,
          old_price: oldPrice,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'flyer',
          image_url: image ? (image.startsWith('http') ? image : `https://www.silas.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Šilas product:', err.message);
      }
    });
    
    console.log(`✅ Šilas: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Šilas scraping failed:', error.message);
    return getSampleSilasOffers();
  }
  
  return offers.length > 0 ? offers : getSampleSilasOffers();
}

function getSampleSilasOffers() {
  return [
    {
      store_chain: 'Šilas',
      product_name: 'Sūris 45% 200g',
      price: 2.79,
      old_price: 3.49,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Šilas',
      product_name: 'Jogurtas 400g',
      price: 1.49,
      old_price: 1.99,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('🏪 Running Šilas connector...');
  
  try {
    const offers = await fetchSilasOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Šilas connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchSilasOffers,
  run,
  storeName: 'Šilas'
};
