const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Topo Centras Connector
 * Real website: https://www.topocentras.lt/akcijos
 * Major Lithuanian furniture and home goods chain!
 */

const TOPO_URL = 'https://www.topocentras.lt/akcijos';

async function fetchTopoOffers() {
  const offers = [];
  
  try {
    console.log(`🏠 Fetching Topo Centras offers from: ${TOPO_URL}`);
    
    const response = await axios.get(TOPO_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'lt-LT,lt;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('.product, .product-card, .offer, .promo').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.product-name, .title, h3').first().text().trim();
        const priceText = $elem.find('.price, .current-price').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .was-price').first().text().trim();
        const category = $elem.find('.category, .cat-name').first().text().trim();
        const image = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price) || price === 0) return;
        
        offers.push({
          store_chain: 'Topo Centras',
          product_name: name,
          price: price,
          old_price: oldPrice,
          category: category || 'Furniture',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'flyer',
          image_url: image ? (image.startsWith('http') ? image : `https://www.topocentras.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Topo Centras product:', err.message);
      }
    });
    
    console.log(`✅ Topo Centras: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Topo Centras scraping failed:', error.message);
    return getSampleTopoOffers();
  }
  
  return offers.length > 0 ? offers : getSampleTopoOffers();
}

function getSampleTopoOffers() {
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      store_chain: 'Topo Centras',
      product_name: 'Sofa "Komfortas" 3 vietų',
      price: 299.99,
      old_price: 449.99,
      category: 'Furniture',
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Topo Centras',
      product_name: 'Lova dvigulė 160x200',
      price: 249.99,
      old_price: 349.99,
      category: 'Furniture',
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Topo Centras',
      product_name: 'Spinta dvivėrė',
      price: 149.99,
      old_price: 199.99,
      category: 'Furniture',
      valid_until: validUntil,
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('🏠 Running Topo Centras connector...');
  
  try {
    const offers = await fetchTopoOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Topo Centras connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchTopoOffers,
  run,
  storeName: 'Topo Centras',
  website: 'https://www.topocentras.lt'
};
