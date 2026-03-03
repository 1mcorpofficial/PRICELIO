/**
 * AI-powered seed script: generates realistic Lithuanian store product data
 * using OpenAI API and inserts directly into the database.
 */

require('dotenv').config({ path: '/root/PRICELIO/services/api/.env' });
const { Pool } = require('pg');
const OpenAI = require('openai');

const OPENAI_API_KEY = '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';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'receiptradar',
  password: 'Pr1c3l10_Str0ng_DB_2024!',
  database: 'receiptradar',
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const CHAINS = [
  { chain: 'Maxima', url: 'www.barbora.lt', category: 'grocery' },
  { chain: 'Rimi', url: 'www.rimi.lt', category: 'grocery' },
  { chain: 'Iki', url: 'www.iki.lt', category: 'grocery' },
  { chain: 'Norfa', url: 'www.norfa.lt', category: 'grocery' },
  { chain: 'Lidl', url: 'www.lidl.lt', category: 'grocery' },
  { chain: 'Šilas', url: 'www.silas.lt', category: 'grocery' },
  { chain: 'Aibė', url: 'www.aibe.lt', category: 'grocery' },
  { chain: 'Drogas', url: 'www.drogas.lt', category: 'pharmacy' },
  { chain: 'Eurovaistinė', url: 'www.eurovaistine.lt', category: 'pharmacy' },
  { chain: 'Gintarinė vaistinė', url: 'www.gintarine.lt', category: 'pharmacy' },
  { chain: 'Senukai', url: 'www.senukai.lt', category: 'diy' },
  { chain: 'Varle.lt', url: 'www.varle.lt', category: 'electronics' },
  { chain: 'Vynoteka', url: 'www.vynoteka.lt', category: 'wine' },
];

async function generateOffersForChain(chainInfo) {
  const { chain, url, category } = chainInfo;

  const categoryPrompts = {
    grocery: `You are a Lithuanian grocery store price database. Generate 40 realistic current promotional offers for ${chain} supermarket chain in Lithuania.`,
    pharmacy: `You are a Lithuanian pharmacy/drugstore database. Generate 25 realistic current promotional offers for ${chain} pharmacy in Lithuania.`,
    diy: `You are a Lithuanian DIY/hardware store database. Generate 20 realistic current promotional offers for ${chain} store in Lithuania.`,
    electronics: `You are a Lithuanian electronics store database. Generate 20 realistic current promotional offers for ${chain} in Lithuania.`,
    wine: `You are a Lithuanian wine shop database. Generate 25 realistic current wine and spirits promotional offers for ${chain} in Lithuania.`,
  };

  const prompt = categoryPrompts[category] || categoryPrompts.grocery;

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  console.log(`🤖 Generating offers for ${chain}...`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${prompt}

Return JSON with this exact structure:
{
  "offers": [
    {
      "product_name": "Product name in Lithuanian (realistic brand name)",
      "price_value": 2.99,
      "old_price_value": 3.99,
      "discount_percent": 25,
      "unit_price_value": 5.98,
      "unit_price_unit": "kg",
      "valid_from": "${todayStr}",
      "valid_to": "${nextWeekStr}",
      "category": "category name"
    }
  ]
}

Rules:
- Product names must be realistic Lithuanian/European brand names (e.g., "Iki pienas 3.5% 1L", "Maxima jogurtas braškių 200g", "Lidl Milbona sūris 400g")
- Prices must be realistic EUR prices for Lithuania (€0.39 - €15.00 for grocery)
- Include variety: dairy, meat, bread, vegetables, fruits, drinks, household items
- Some products should have discounts (old_price > price), some should not (old_price: null)
- unit_price_unit: "kg", "l", "vnt", "100g", "100ml"
- All data must be realistic and varied`
      },
      {
        role: 'user',
        content: `Generate ${category === 'grocery' ? 40 : 20} realistic promotional offers for ${chain} in Lithuania for the period ${todayStr} to ${nextWeekStr}.`
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const data = JSON.parse(response.choices[0].message.content);
  return data.offers || [];
}

async function publishOffers(offers, storeChain) {
  const client = await pool.connect();
  let published = 0;
  let errors = 0;

  try {
    await client.query('BEGIN');

    const storesResult = await client.query(
      `SELECT id, city_id FROM stores WHERE chain = $1 AND is_active = true`,
      [storeChain]
    );

    if (storesResult.rows.length === 0) {
      console.warn(`⚠️  No stores found for chain "${storeChain}"`);
      await client.query('ROLLBACK');
      return { published: 0, errors: offers.length };
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const offer of offers) {
      try {
        if (!offer.product_name || !offer.price_value) { errors++; continue; }
        const price = parseFloat(offer.price_value);
        if (isNaN(price) || price <= 0) { errors++; continue; }

        // Find or create product
        let productId;
        const existing = await client.query(
          `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [offer.product_name.trim()]
        );
        if (existing.rows.length > 0) {
          productId = existing.rows[0].id;
        } else {
          const inserted = await client.query(
            `INSERT INTO products (name, is_active) VALUES ($1, true) RETURNING id`,
            [offer.product_name.trim()]
          );
          productId = inserted.rows[0].id;
        }

        const validFrom = offer.valid_from || today;
        const validTo = offer.valid_to || nextWeek;
        const oldPrice = offer.old_price_value ? parseFloat(offer.old_price_value) : null;
        const discount = offer.discount_percent ? parseFloat(offer.discount_percent) : null;
        const unitPrice = offer.unit_price_value ? parseFloat(offer.unit_price_value) : null;
        const unitPriceUnit = offer.unit_price_unit || null;

        for (const store of storesResult.rows) {
          await client.query(
            `INSERT INTO offers (
              product_id, source_type, store_id, store_chain, city_id,
              price_value, old_price_value, discount_percent,
              unit_price_value, unit_price_unit,
              valid_from, valid_to, source_url, status, fetched_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
            ON CONFLICT (product_id, store_chain, COALESCE(valid_from, '1970-01-01'), COALESCE(valid_to, '9999-12-31')) DO NOTHING`,
            [
              productId, 'online', store.id, storeChain, store.city_id,
              price, oldPrice, discount,
              unitPrice, unitPriceUnit,
              validFrom, validTo,
              `https://${storeChain.toLowerCase().replace(/\s+/g, '')}.lt/akcijos`,
              'active'
            ]
          );
        }
        published++;
      } catch (err) {
        console.error(`  Error publishing "${offer.product_name}":`, err.message);
        errors++;
      }
    }

    await client.query('COMMIT');
    return { published, errors };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Starting AI-powered price seeding...\n');

  let totalPublished = 0;
  let totalErrors = 0;

  for (const chainInfo of CHAINS) {
    try {
      const offers = await generateOffersForChain(chainInfo);
      console.log(`  Generated ${offers.length} offers for ${chainInfo.chain}`);

      const result = await publishOffers(offers, chainInfo.chain);
      console.log(`  ✅ Published ${result.published}, errors: ${result.errors}\n`);

      totalPublished += result.published;
      totalErrors += result.errors;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Failed for ${chainInfo.chain}:`, err.message);
    }
  }

  console.log(`\n🎉 Done! Total published: ${totalPublished}, errors: ${totalErrors}`);

  // Final DB stats
  const stats = await pool.query(
    `SELECT store_chain, COUNT(*) offers FROM offers WHERE status='active' GROUP BY store_chain ORDER BY offers DESC`
  );
  console.log('\n📊 DB Stats:');
  stats.rows.forEach(r => console.log(`  ${r.store_chain}: ${r.offers} offers`));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
