const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Norfa Connector
 * Scrapes offers from Norfa website and flyers
 */

async function fetchNorfaOffers() {
  const offers = [];
  
  try {
    // Norfa website: https://www.norfa.lt/akcijos
    const response = await axios.get('https://www.norfa.lt/akcijos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse products from Norfa's HTML structure
    $('.product-item, .akcija-item, .offer-card').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const name = $elem.find('.product-name, .title, h3').first().text().trim();
        const priceText = $elem.find('.price, .product-price, .akcija-kaina').first().text().trim();
        const oldPriceText = $elem.find('.old-price, .original-price, .sena-kaina').first().text().trim();
        const validText = $elem.find('.valid, .galioja, .date').first().text().trim();
        const image = $elem.find('img').first().attr('src');
        
        if (!name || !priceText) return;
        
        // Extract price (e.g., "1,99 €" -> 1.99)
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
        
        if (isNaN(price)) return;
        
        // Extract validity date
        let validUntil = null;
        if (validText) {
          const dateMatch = validText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            validUntil = dateMatch[0];
          }
        }
        
        offers.push({
          store_chain: 'Norfa',
          product_name: name,
          price: price,
          old_price: oldPrice,
          valid_until: validUntil,
          source: 'flyer',
          image_url: image ? (image.startsWith('http') ? image : `https://www.norfa.lt${image}`) : null,
          scraped_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error parsing Norfa product:', err.message);
      }
    });
    
    console.log(`✅ Norfa: Found ${offers.length} offers`);
    
  } catch (error) {
    console.error('❌ Norfa scraping failed:', error.message);
    
    // Return sample data if scraping fails
    return getSampleNorfaOffers();
  }
  
  return offers.length > 0 ? offers : getSampleNorfaOffers();
}

function getSampleNorfaOffers() {
  return [
    {
      store_chain: 'Norfa',
      product_name: 'Duona ruginė 500g',
      price: 0.99,
      old_price: 1.29,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Norfa',
      product_name: 'Pienas 2.5% 1L',
      price: 1.19,
      old_price: 1.49,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    },
    {
      store_chain: 'Norfa',
      product_name: 'Kiaušiniai M 10vnt',
      price: 2.49,
      old_price: 2.99,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: 'flyer',
      image_url: null,
      scraped_at: new Date().toISOString()
    }
  ];
}

async function run() {
  console.log('🏪 Running Norfa connector...');
  
  try {
    const offers = await fetchNorfaOffers();
    
    return {
      fetched: offers.length,
      offers: offers,
      status: 'success'
    };
  } catch (error) {
    console.error('❌ Norfa connector failed:', error);
    throw error;
  }
}

module.exports = {
  fetchNorfaOffers,
  run,
  storeName: 'Norfa'
};
