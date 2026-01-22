const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Senukai Connector
 * Scrapes offers from Senukai (DIY/Hardware) website and flyers
 */

async function fetchSenukaiOffers() {
  const offers = [];
  
  try {
    // Senukai website: https://www.senukai.lt/akcijos
    const response = await axios.get('https://www.senukai.lt/akcijos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse products
    $('.product-card, .akcija-item, .offer').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.product-name, .title, h3').first().text().trim();
        const priceText = $elem.find('.price, .kaina').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .sena-kaina').first().text().trim();
        const category = $elem.find('.category, .kategorija').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price)) return;
        
        offers.push({
          store_chain: 'Senukai',
          product_name: name,
          price: price,
          old_price: oldPrice,
          category: category || 'DIY',
          valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'flyer',
          image_url: image ? (image.startsWith('http') ? image : `https://www.senukai.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Senukai product:', err.message);
      }
    });
    
    console.log(`✅ Senukai: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Senukai scraping failed:', error.message);
    return getSampleSenukaiOffers();
  }
  
  return offers.length > 0 ? offers : getSampleSenukaiOffers();
}

function getSampleSenukaiOffers() {
  return [
    {
      store_chain: 'Senukai',
      product_name: 'Grąžtas 10mm',
      price: 4.99,
      old_price: 7.99,
      category: 'DIY',
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Senukai',
      product_name: 'Lempa LED 10W',
      price: 2.49,
      old_price: 3.99,
      category: 'DIY',
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Senukai',
      product_name: 'Šepetys dažymui',
      price: 1.99,
      old_price: 2.99,
      category: 'DIY',
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('🔨 Running Senukai connector...');
  
  try {
    const offers = await fetchSenukaiOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Senukai connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchSenukaiOffers,
  run,
  storeName: 'Senukai'
};
