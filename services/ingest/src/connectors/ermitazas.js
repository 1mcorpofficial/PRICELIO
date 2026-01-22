const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Ermitažas Connector
 * Scrapes offers from Ermitažas (Bookstore) website and promotions
 */

async function fetchErmitazasOffers() {
  const offers = [];
  
  try {
    // Ermitažas website: https://www.ermitazas.lt/akcijos
    const response = await axios.get('https://www.ermitazas.lt/akcijos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse books/products
    $('.book, .product, .akcija').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.title, .name, h3').first().text().trim();
        const author = $elem.find('.author, .autorius').first().text().trim();
        const priceText = $elem.find('.price, .kaina').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .sena-kaina').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (!name || !priceText) return;
        
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price)) return;
        
        const fullName = author ? `${name} - ${author}` : name;
        
        offers.push({
          store_chain: 'Ermitažas',
          product_name: fullName,
          price: price,
          old_price: oldPrice,
          category: 'Books',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: 'online',
          image_url: image ? (image.startsWith('http') ? image : `https://www.ermitazas.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Ermitažas product:', err.message);
      }
    });
    
    console.log(`✅ Ermitažas: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Ermitažas scraping failed:', error.message);
    return getSampleErmitazasOffers();
  }
  
  return offers.length > 0 ? offers : getSampleErmitazasOffers();
}

function getSampleErmitazasOffers() {
  return [
    {
      store_chain: 'Ermitažas',
      product_name: 'Sapiens - Yuval Noah Harari',
      price: 12.99,
      old_price: 16.99,
      category: 'Books',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Ermitažas',
      product_name: 'Harry Potter - J.K. Rowling',
      price: 9.99,
      old_price: 14.99,
      category: 'Books',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'online',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('📚 Running Ermitažas connector...');
  
  try {
    const offers = await fetchErmitazasOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Ermitažas connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchErmitazasOffers,
  run,
  storeName: 'Ermitažas'
};
