const { getClient } = require('./db');

// Dangerous E-additives database
const DANGEROUS_E_ADDITIVES = {
  'E102': { name: 'Tartrazine', danger: 'high', effects: 'Hyperactivity, allergies' },
  'E104': { name: 'Quinoline Yellow', danger: 'high', effects: 'Hyperactivity, asthma' },
  'E110': { name: 'Sunset Yellow', danger: 'high', effects: 'Allergies, hyperactivity' },
  'E122': { name: 'Carmoisine', danger: 'high', effects: 'Hyperactivity, cancer risk' },
  'E123': { name: 'Amaranth', danger: 'very_high', effects: 'Cancer risk, banned in USA' },
  'E124': { name: 'Ponceau 4R', danger: 'high', effects: 'Hyperactivity, allergies' },
  'E127': { name: 'Erythrosine', danger: 'high', effects: 'Thyroid issues, hyperactivity' },
  'E129': { name: 'Allura Red', danger: 'high', effects: 'Hyperactivity, allergies' },
  'E131': { name: 'Patent Blue V', danger: 'medium', effects: 'Allergies' },
  'E142': { name: 'Green S', danger: 'medium', effects: 'Allergies, hyperactivity' },
  'E151': { name: 'Brilliant Black', danger: 'medium', effects: 'Allergies' },
  'E154': { name: 'Brown FK', danger: 'high', effects: 'Allergies, banned in many countries' },
  'E155': { name: 'Brown HT', danger: 'medium', effects: 'Allergies, asthma' },
  'E211': { name: 'Sodium Benzoate', danger: 'medium', effects: 'Hyperactivity when combined with E-colors' },
  'E220': { name: 'Sulphur Dioxide', danger: 'medium', effects: 'Breathing problems, allergies' },
  'E249': { name: 'Potassium Nitrite', danger: 'high', effects: 'Cancer risk' },
  'E250': { name: 'Sodium Nitrite', danger: 'high', effects: 'Cancer risk' },
  'E251': { name: 'Sodium Nitrate', danger: 'high', effects: 'Cancer risk' },
  'E252': { name: 'Potassium Nitrate', danger: 'high', effects: 'Cancer risk' },
  'E319': { name: 'TBHQ', danger: 'medium', effects: 'Nausea, vomiting' },
  'E320': { name: 'BHA', danger: 'high', effects: 'Cancer risk' },
  'E321': { name: 'BHT', danger: 'high', effects: 'Cancer risk, hyperactivity' },
  'E621': { name: 'MSG', danger: 'medium', effects: 'Headaches, nausea' },
  'E951': { name: 'Aspartame', danger: 'high', effects: 'Headaches, controversies' }
};

async function analyzeReceiptNutrition(receiptId) {
  const client = await getClient();
  
  try {
    // Get all receipt items with matched products
    const itemsResult = await client.query(
      `SELECT 
        ri.id,
        ri.matched_product_id,
        ri.quantity,
        p.name,
        p.nutritional_data,
        p.ingredients,
        p.e_additives,
        p.allergens,
        p.pack_size_value,
        p.pack_size_unit
       FROM receipt_items ri
       LEFT JOIN products p ON p.id = ri.matched_product_id
       WHERE ri.receipt_id = $1 AND ri.matched_product_id IS NOT NULL`,
      [receiptId]
    );
    
    if (itemsResult.rows.length === 0) {
      return {
        success: false,
        message: 'No products with nutritional data found'
      };
    }
    
    // Calculate totals
    let totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      sugar: 0,
      fat: 0,
      salt: 0,
      fiber: 0
    };
    
    const allEAdditives = new Map(); // E-code -> {info, found_in: [products]}
    const allAllergens = new Set();
    const productAnalysis = [];
    
    for (const item of itemsResult.rows) {
      const quantity = parseFloat(item.quantity) || 1;
      const packSize = parseFloat(item.pack_size_value) || 100;
      
      // Calculate actual grams purchased
      let gramsPerUnit = packSize;
      if (item.pack_size_unit === 'kg') {
        gramsPerUnit = packSize * 1000;
      } else if (item.pack_size_unit === 'L') {
        gramsPerUnit = packSize * 1000; // Approximate
      }
      
      const totalGrams = gramsPerUnit * quantity;
      const servings = totalGrams / 100; // Per 100g
      
      // Add nutritional values
      if (item.nutritional_data) {
        const nutrition = item.nutritional_data;
        totals.calories += (nutrition.calories || 0) * servings;
        totals.protein += (nutrition.protein || 0) * servings;
        totals.carbs += (nutrition.carbs || 0) * servings;
        totals.sugar += (nutrition.sugar || 0) * servings;
        totals.fat += (nutrition.fat || 0) * servings;
        totals.salt += (nutrition.salt || 0) * servings;
        totals.fiber += (nutrition.fiber || 0) * servings;
      }
      
      // Collect E-additives
      if (item.e_additives && item.e_additives.length > 0) {
        for (const eCode of item.e_additives) {
          if (DANGEROUS_E_ADDITIVES[eCode]) {
            if (!allEAdditives.has(eCode)) {
              allEAdditives.set(eCode, {
                code: eCode,
                ...DANGEROUS_E_ADDITIVES[eCode],
                found_in: []
              });
            }
            allEAdditives.get(eCode).found_in.push({
              product_id: item.matched_product_id,
              product_name: item.name
            });
          }
        }
      }
      
      // Collect allergens
      if (item.allergens && item.allergens.length > 0) {
        item.allergens.forEach(a => allAllergens.add(a));
      }
      
      productAnalysis.push({
        product_name: item.name,
        quantity: quantity,
        total_grams: Math.round(totalGrams),
        e_additives: item.e_additives || [],
        allergens: item.allergens || []
      });
    }
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct points for harmful additives
    const harmfulAdditives = Array.from(allEAdditives.values());
    harmfulAdditives.forEach(additive => {
      if (additive.danger === 'very_high') healthScore -= 15;
      else if (additive.danger === 'high') healthScore -= 10;
      else if (additive.danger === 'medium') healthScore -= 5;
    });
    
    // Deduct points for excessive sugar (>50g per 100g average)
    const avgSugar = totals.sugar / itemsResult.rows.length;
    if (avgSugar > 50) healthScore -= 20;
    else if (avgSugar > 30) healthScore -= 10;
    else if (avgSugar > 15) healthScore -= 5;
    
    // Deduct points for excessive salt (>2g per 100g average)
    const avgSalt = totals.salt / itemsResult.rows.length;
    if (avgSalt > 2) healthScore -= 15;
    else if (avgSalt > 1.5) healthScore -= 10;
    else if (avgSalt > 1) healthScore -= 5;
    
    // Ensure score is within bounds
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Generate analysis notes
    const notes = [];
    
    if (harmfulAdditives.length > 0) {
      notes.push(`⚠️ Found ${harmfulAdditives.length} harmful E-additives in your products`);
    }
    
    if (totals.sugar > 200) {
      notes.push(`⚠️ High sugar content: ${Math.round(totals.sugar)}g total`);
    }
    
    if (totals.salt > 20) {
      notes.push(`⚠️ High salt content: ${totals.salt.toFixed(1)}g total`);
    }
    
    if (allAllergens.size > 0) {
      notes.push(`ℹ️ Contains allergens: ${Array.from(allAllergens).join(', ')}`);
    }
    
    if (healthScore >= 80) {
      notes.push('✅ Good nutritional profile overall');
    } else if (healthScore >= 60) {
      notes.push('⚠️ Moderate nutritional profile');
    } else {
      notes.push('❌ Poor nutritional profile - consider healthier alternatives');
    }
    
    // Save analysis to database
    const analysisResult = await client.query(
      `INSERT INTO receipt_nutritional_analysis (
        receipt_id,
        total_calories,
        total_protein,
        total_carbs,
        total_sugar,
        total_fat,
        total_salt,
        total_fiber,
        harmful_e_additives,
        allergen_warnings,
        health_score,
        analysis_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        receiptId,
        Math.round(totals.calories),
        totals.protein.toFixed(1),
        totals.carbs.toFixed(1),
        totals.sugar.toFixed(1),
        totals.fat.toFixed(1),
        totals.salt.toFixed(1),
        totals.fiber.toFixed(1),
        JSON.stringify(harmfulAdditives),
        Array.from(allAllergens),
        Math.round(healthScore),
        notes.join('\n')
      ]
    );
    
    return {
      success: true,
      analysis: {
        totals: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          sugar: Math.round(totals.sugar),
          fat: Math.round(totals.fat),
          salt: totals.salt.toFixed(1),
          fiber: Math.round(totals.fiber)
        },
        harmful_e_additives: harmfulAdditives,
        allergens: Array.from(allAllergens),
        health_score: Math.round(healthScore),
        notes: notes,
        product_breakdown: productAnalysis
      }
    };
    
  } finally {
    client.release();
  }
}

module.exports = {
  analyzeReceiptNutrition,
  DANGEROUS_E_ADDITIVES
};
