/**
 * Project Baskets - Predefined basket templates
 * Templates for specific needs: Baby, Pets, DIY projects, etc.
 */

const { query } = require('./db');

/**
 * Project Basket Templates
 */
const PROJECT_TEMPLATES = {
  baby: {
    name: 'Naujagimio Komplektas',
    icon: '👶',
    description: 'Visi būtini dalykai naujagimui',
    items: [
      { product: 'Sauskelnės', quantity: 2, category: 'baby' },
      { product: 'Drėgnos servetėlės', quantity: 3, category: 'baby' },
      { product: 'Pieno mišinys', quantity: 2, category: 'baby' },
      { product: 'Buteliukai', quantity: 4, category: 'baby' },
      { product: 'Kūdikio šampūnas', quantity: 1, category: 'baby' },
      { product: 'Kremas nuo oprelių', quantity: 1, category: 'baby' }
    ]
  },
  
  pet_dog: {
    name: 'Šunims - Mėnesio Atsargos',
    icon: '🐕',
    description: 'Mėnesio maistas ir priežiūros priemonės šuniui',
    items: [
      { product: 'Sausas šunų maistas', quantity: 1, size: '10kg', category: 'pets' },
      { product: 'Konservai šunims', quantity: 12, category: 'pets' },
      { product: 'Šunų skanėstai', quantity: 2, category: 'pets' },
      { product: 'Šunų šampūnas', quantity: 1, category: 'pets' }
    ]
  },
  
  pet_cat: {
    name: 'Katėms - Mėnesio Atsargos',
    icon: '🐱',
    description: 'Mėnesio maistas ir priežiūros priemonės katei',
    items: [
      { product: 'Sausas kačių maistas', quantity: 1, size: '5kg', category: 'pets' },
      { product: 'Konservai katėms', quantity: 12, category: 'pets' },
      { product: 'Kačių žvyras', quantity: 2, size: '10L', category: 'pets' },
      { product: 'Kačių skanėstai', quantity: 1, category: 'pets' }
    ]
  },
  
  diy_paint: {
    name: 'Dažymo Projektas',
    icon: '🎨',
    description: 'Kambario nudažymui (20m²)',
    items: [
      { product: 'Sienų dažai', quantity: 3, size: '3L', category: 'diy' },
      { product: 'Gruntas', quantity: 1, size: '3L', category: 'diy' },
      { product: 'Dažymo volelis', quantity: 2, category: 'diy' },
      { product: 'Šepetys', quantity: 3, category: 'diy' },
      { product: 'Dažymo padėklas', quantity: 2, category: 'diy' },
      { product: 'Apsauginė plėvelė', quantity: 1, category: 'diy' },
      { product: 'Maliarios juosta', quantity: 2, category: 'diy' }
    ]
  },
  
  diy_garden: {
    name: 'Sodo Įrankiai',
    icon: '🌱',
    description: 'Pagrindinis sodo priežiūros rinkinys',
    items: [
      { product: 'Sodo žirklės', quantity: 1, category: 'diy' },
      { product: 'Kastuvas', quantity: 1, category: 'diy' },
      { product: 'Grėblys', quantity: 1, category: 'diy' },
      { product: 'Laistymo žarna', quantity: 1, size: '20m', category: 'diy' },
      { product: 'Pirštinės sodo darbams', quantity: 2, category: 'diy' },
      { product: 'Trąšos', quantity: 1, size: '5kg', category: 'diy' }
    ]
  },
  
  weekly_grocery: {
    name: 'Savaitinis Maistas (4 žmonėms)',
    icon: '🛒',
    description: 'Pagrindiniai produktai savaitei',
    items: [
      { product: 'Duona', quantity: 2, category: 'grocery' },
      { product: 'Pienas', quantity: 4, size: '1L', category: 'grocery' },
      { product: 'Kiaušiniai', quantity: 2, size: '10vnt', category: 'grocery' },
      { product: 'Sūris', quantity: 1, size: '500g', category: 'grocery' },
      { product: 'Vištiena', quantity: 2, size: '1kg', category: 'grocery' },
      { product: 'Bulvės', quantity: 1, size: '2kg', category: 'grocery' },
      { product: 'Pomidorai', quantity: 1, size: '1kg', category: 'grocery' },
      { product: 'Obuoliai', quantity: 1, size: '1kg', category: 'grocery' }
    ]
  },
  
  party_10people: {
    name: 'Vakarėlis (10 žmonių)',
    icon: '🎉',
    description: 'Užkandžiai ir gėrimai vakarėliui',
    items: [
      { product: 'Limonadas', quantity: 4, size: '2L', category: 'grocery' },
      { product: 'Sūris pjaustomas', quantity: 2, size: '500g', category: 'grocery' },
      { product: 'Kumpis', quantity: 2, size: '500g', category: 'grocery' },
      { product: 'Traškučiai', quantity: 4, category: 'grocery' },
      { product: 'Piją', quantity: 2, size: '1kg', category: 'grocery' },
      { product: 'Alus', quantity: 12, category: 'grocery' },
      { product: 'Tortas', quantity: 1, category: 'grocery' }
    ]
  }
};

/**
 * Get all available project templates
 */
function getProjectTemplates() {
  return Object.keys(PROJECT_TEMPLATES).map(key => ({
    id: key,
    ...PROJECT_TEMPLATES[key]
  }));
}

/**
 * Get specific template by ID
 */
function getTemplate(templateId) {
  return PROJECT_TEMPLATES[templateId] || null;
}

/**
 * Create basket from template
 */
async function createBasketFromTemplate(userId, templateId) {
  const template = getTemplate(templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  // Create basket
  const basketResult = await query(
    `INSERT INTO baskets (user_id, name, status, created_at)
     VALUES ($1, $2, 'active', NOW())
     RETURNING *`,
    [userId, template.name]
  );
  
  const basket = basketResult.rows[0];
  
  // Add items from template
  for (const item of template.items) {
    // Try to find matching product
    const productResult = await query(
      `SELECT id FROM products 
       WHERE LOWER(name) LIKE LOWER($1) 
       AND is_active = true 
       LIMIT 1`,
      [`%${item.product}%`]
    );
    
    if (productResult.rows.length > 0) {
      await query(
        `INSERT INTO basket_items (basket_id, product_id, quantity, notes, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          basket.id,
          productResult.rows[0].id,
          item.quantity,
          item.size || null
        ]
      );
    } else {
      // Create as unmatched item
      await query(
        `INSERT INTO basket_items (basket_id, product_id, quantity, notes, created_at)
         VALUES ($1, NULL, $2, $3, NOW())`,
        [basket.id, item.quantity, `${item.product} ${item.size || ''}`]
      );
    }
  }
  
  return basket;
}

/**
 * Get recommended templates based on user history
 */
async function getRecommendedTemplates(userId) {
  // Analyze user's past purchases
  const history = await query(
    `SELECT p.category_id, COUNT(*) as count
     FROM receipt_items ri
     JOIN receipts r ON r.id = ri.receipt_id
     JOIN products p ON p.id = ri.product_id
     WHERE r.user_id = $1
     GROUP BY p.category_id
     ORDER BY count DESC
     LIMIT 3`,
    [userId]
  );
  
  // Recommend templates based on categories
  const recommendations = [];
  
  // For now, just return popular templates
  recommendations.push('weekly_grocery');
  recommendations.push('diy_paint');
  recommendations.push('pet_dog');
  
  return recommendations.map(id => ({
    id,
    ...PROJECT_TEMPLATES[id]
  }));
}

module.exports = {
  getProjectTemplates,
  getTemplate,
  createBasketFromTemplate,
  getRecommendedTemplates
};
