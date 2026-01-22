/**
 * AI Helper - Universal AI Assistant
 * Uses OpenAI GPT-4 for various tasks
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 1. PARDUOTUVIŲ DUOMENŲ EKSTRAKCIJA
 * Ekstrahuoja prekes ir kainas iš parduotuvių svetainių HTML
 */
async function extractStoreData(html, storeName) {
  try {
    const prompt = `Tu esi duomenų ekstrakcijos specialistas. Iš šio HTML kodo ištrauk VISAS prekes su kainomis.

Parduotuvė: ${storeName}

HTML:
${html.substring(0, 8000)} // Limit to 8k chars

ATSAKYK JSON formatu:
{
  "products": [
    {
      "name": "Produkto pavadinimas",
      "price": 1.99,
      "old_price": 2.49,
      "unit": "kg arba vnt",
      "brand": "Prekės ženklas",
      "category": "Kategorija",
      "image_url": "URL",
      "valid_from": "2026-01-20",
      "valid_to": "2026-01-27"
    }
  ]
}

SVARBŪS REIKALAVIMAI:
- Ištrauk VISAS prekes su kainomis
- Kaina TURI būti skaičius (float)
- Jei matai "€" arba "EUR", ištrauk tik skaičių
- Jei yra sena kaina (old_price), ją taip pat ištrauk
- Pavadinimas lietuvių kalba
- Galiojimo datos formato: YYYY-MM-DD`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi tikslus duomenų ekstrakcijos specialistas. Visada atsakai tik JSON formatu.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      success: true,
      products: result.products || [],
      count: (result.products || []).length,
      store: storeName
    };
  } catch (error) {
    console.error('Store data extraction error:', error);
    return {
      success: false,
      error: error.message,
      products: []
    };
  }
}

/**
 * 2. KAINŲ ANALIZĖ IR ATNAUJINIMAS
 * Analizuoja kainų pokyčius ir rekomenduoja veiksmus
 */
async function analyzePriceChanges(product, historicalPrices) {
  try {
    const prompt = `Tu esi kainų analizės ekspertas. Analizuok šio produkto kainų istoriją:

Produktas: ${product.name}
Dabartinė kaina: €${product.current_price}

Istorinės kainos (paskutiniai 30 dienų):
${JSON.stringify(historicalPrices, null, 2)}

ANALIZUOK IR ATSAKYK JSON:
{
  "trend": "increasing / decreasing / stable",
  "average_price": 0.00,
  "min_price": 0.00,
  "max_price": 0.00,
  "price_change_percent": 0.0,
  "is_good_deal": true/false,
  "recommendation": "Rekomendacija lietuvių kalba",
  "predicted_next_price": 0.00,
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi kainų analizės ekspertas. Atsakai tik JSON formatu.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Price analysis error:', error);
    return null;
  }
}

/**
 * 3. KREPŠELIO OPTIMIZAVIMAS SU AI
 * AI padeda surasti geriausius produktų derinius
 */
async function optimizeBasketWithAI(basketItems, userPreferences = {}) {
  try {
    const prompt = `Tu esi apsipirkimo optimizavimo ekspertas. Padėk optimizuoti šį krepšelį:

KREPŠELIS:
${JSON.stringify(basketItems, null, 2)}

VARTOTOJO PREFERENCIJOS:
${JSON.stringify(userPreferences, null, 2)}

UŽDUOTIS:
1. Rask alternatyvas pigesnėms kainoms
2. Pasiūlyk geresnio vieneto kainos produktus
3. Pasiūlyk pakuotes, kurios sutaupytų pinigų
4. Įvertink maistinę vertę (jei tai maistas)

ATSAKYK JSON:
{
  "original_total": 0.00,
  "optimized_total": 0.00,
  "savings": 0.00,
  "recommendations": [
    {
      "original_product": "Produktas",
      "alternative_product": "Alternatyva",
      "reason": "Priežastis lietuvių kalba",
      "savings": 0.50
    }
  ],
  "health_notes": ["Pastabos apie sveikatą"],
  "summary": "Santrauka lietuvių kalba"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi apsipirkimo ir sveikos mitybos ekspertas. Atsakai JSON formatu.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Basket optimization error:', error);
    return null;
  }
}

/**
 * 4. MAISTO VERTĖS IR SUDĖTIES ANALIZĖ
 * Analizuoja produkto maistinę vertę ir įspėja apie pavojingas medžiagas
 */
async function analyzeNutritionalValue(productName, ingredients = null, nutritionalInfo = null) {
  try {
    const prompt = `Tu esi mitybos ekspertas. Analizuok šį produktą:

PRODUKTAS: ${productName}

${ingredients ? `SUDĖTIS: ${ingredients}` : ''}
${nutritionalInfo ? `MAISTINĖ VERTĖ: ${JSON.stringify(nutritionalInfo)}` : ''}

ANALIZUOK IR ATSAKYK JSON:
{
  "product": "${productName}",
  "health_score": 75,
  "calories_per_100g": 250,
  "nutritional_analysis": {
    "protein": 5.0,
    "carbs": 45.0,
    "sugar": 12.0,
    "fat": 8.0,
    "saturated_fat": 3.0,
    "fiber": 3.0,
    "salt": 1.2
  },
  "harmful_substances": [
    {
      "name": "E621",
      "type": "Skonio stipriklis",
      "risk_level": "medium",
      "description": "Gali sukelti alergines reakcijas"
    }
  ],
  "allergens": ["Glitimas", "Pieno produktai"],
  "is_healthy": true/false,
  "health_warnings": [
    "Didelis cukraus kiekis",
    "Rekomenduojama vartoti ribotai"
  ],
  "recommendations": [
    "Geriau rinktis produktus su mažesniu cukraus kiekiu",
    "Alternatyvos: [produktų pavadinimai]"
  ],
  "summary": "Trumpa analizė lietuvių kalba"
}

SVARBŪS KRITERIJAI:
- Įvertink E-medžiagas (E100-E1520)
- Identifikuok alergenus
- Įvertink cukraus kiekį (>10g/100g = daug)
- Įvertink druskos kiekį (>1.5g/100g = daug)
- Health score: 0-100 (kuo aukštesnis, tuo sveikesnis)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi mitybos ir sveikatos ekspertas. Atsakai tik JSON formatu.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Nutritional analysis error:', error);
    return null;
  }
}

/**
 * 5. PRODUKTŲ PALYGINIMAS
 * Palygina kelis produktus ir rekomenduoja geriausią
 */
async function compareProducts(products) {
  try {
    const prompt = `Tu esi produktų palyginimo ekspertas. Palygink šiuos produktus:

PRODUKTAI:
${JSON.stringify(products, null, 2)}

PALYGINK PAGAL:
1. Kainą ir vieneto kainą
2. Maistinę vertę (jei tai maistas)
3. Prekės ženklą ir kokybę
4. Value for money

ATSAKYK JSON:
{
  "best_overall": "Produkto pavadinimas",
  "best_price": "Produkto pavadinimas",
  "best_quality": "Produkto pavadinimas",
  "best_value": "Produkto pavadinimas",
  "comparison": [
    {
      "product": "Produktas",
      "pros": ["Pliusai"],
      "cons": ["Minusai"],
      "score": 85,
      "recommendation": "Kam tinka"
    }
  ],
  "summary": "Santrauka lietuvių kalba"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi produktų palyginimo ekspertas. Atsakai JSON formatu.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Product comparison error:', error);
    return null;
  }
}

/**
 * 6. SMART PAIEŠKA
 * AI padeda rasti produktus pagal natūralią kalbą
 */
async function smartSearch(query, availableProducts) {
  try {
    const prompt = `Tu esi produktų paieškos ekspertas. Vartotojas ieško: "${query}"

PRIEINAMI PRODUKTAI:
${JSON.stringify(availableProducts.slice(0, 50), null, 2)}

RASK GERIAUSIUS ATITIKIMUS IR ATSAKYK JSON:
{
  "understood_query": "Kas vartotojas iš tikrųjų nori",
  "results": [
    {
      "product_id": "uuid",
      "name": "Produkto pavadinimas",
      "relevance_score": 0.95,
      "reason": "Kodėl tinka"
    }
  ],
  "suggestions": ["Alternatyvios paieškos frazės"],
  "category": "Nustatyta kategorija"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Tu esi produktų paieškos ekspertas. Supranti lietuvių kalbą.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Smart search error:', error);
    return null;
  }
}

/**
 * 7. AI ASISTENTAS - BENDRAS
 * Atsakymas į bet kokį vartotojo klausimą
 */
async function aiAssistant(userQuestion, context = {}) {
  try {
    const contextStr = Object.keys(context).length > 0 
      ? `\n\nKONTEKSTAS:\n${JSON.stringify(context, null, 2)}`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `Tu esi ReceiptRadar / Pricelio AI asistentas. Padedi vartotojams:
- Rasti geriausias kainas
- Optimizuoti krepšelius
- Suprasti maistinę vertę
- Palyginti produktus
- Taupyti pinigus

Visada atsakai lietuvių kalba, draugiškai ir naudingai.` 
        },
        { role: 'user', content: userQuestion + contextStr }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      answer: response.choices[0].message.content,
      tokens_used: response.usage.total_tokens
    };
  } catch (error) {
    console.error('AI assistant error:', error);
    return {
      answer: 'Atsiprašau, įvyko klaida. Bandykite dar kartą.',
      error: error.message
    };
  }
}

module.exports = {
  extractStoreData,
  analyzePriceChanges,
  optimizeBasketWithAI,
  analyzeNutritionalValue,
  compareProducts,
  smartSearch,
  aiAssistant
};
