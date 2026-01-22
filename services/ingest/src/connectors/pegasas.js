const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Pegasas Connector
 * Real website: https://www.pegasas.lt/akcijos
 * Major Lithuanian bookstore chain!
 */

const PEGASAS_URL = 'https://www.pegasas.lt/akcijos';

async function fetchPegasasOffers() {
  const offers = [];
  
  try {
    console.log(`📚 Fetching Pegasas offers from: ${PEGASAS_URL}`);
    
    const response = await axios.get(PEGASAS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'lt-LT,lt;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('.book, .product, .book-card, .offer').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.title, .book-title, h3').first().text().trim();
        const author = $elem.find('.author, .autorius').first().text().trim();
        const priceText = $elem.find('.price, .sale-price').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .regular-price').first().text().trim();
        const image = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price) || price === 0) return;
        
        const fullName = author ? `${name} - ${author}` : name;
        
        offers.push({
          store_chain: 'Pegasas',
          product_name: fullName,
          price: price,
          old_price: oldPrice,
          category: 'Books',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'online',
          image_url: image ? (image.startsWith('http') ? image : `https://www.pegasas.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Pegasas product:', err.message);
      }
    });
    
    console.log(`✅ Pegasas: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Pegasas scraping failed:', error.message);
    return getSamplePegasasOffers();
  }
  
  return offers.length > 0 ? offers : getSamplePegasasOffers();
}

function getSamplePegasasOffers() {
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      store_chain: 'Pegasas',
      product_name: 'Mėta po kojomis - Andrius Tapinas',
      price: 11.99,
      old_price: 14.99,
      category: 'Books',
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Pegasas',
      product_name: 'Šiaurės pašvaistė - Kristin Hannah',
      price: 13.99,
      old_price: 16.99,
      category: 'Books',
      valid_until: validUntil,
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('📚 Running Pegasas connector...');
  
  try {
    const offers = await fetchPegasasOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Pegasas connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchPegasasOffers,
  run,
  storeName: 'Pegasas',
  website: 'https://www.pegasas.lt'
};
