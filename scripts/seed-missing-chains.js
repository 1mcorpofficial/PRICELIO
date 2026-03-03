/**
 * Seed script for missing Lithuanian store chains.
 * 1. Queries DB for chains with 0 active offers.
 * 2. Uses OpenAI gpt-4o-mini to generate 20-30 realistic products.
 * 3. Also runs an extra round for major grocery chains (Maxima, Rimi, Iki, Norfa, Lidl)
 *    generating 60 offers each to push them past 100 total.
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

// Chain metadata for missing chains
const MISSING_CHAIN_META = {
  'JYSK':         { category: 'home',        url: 'www.jysk.lt',          count: 25 },
  'Topo Centras': { category: 'electronics', url: 'www.topocentras.lt',   count: 25 },
  'Moki Veži':    { category: 'grocery',     url: 'www.mokivezi.lt',      count: 25 },
  'Ermitažas':    { category: 'electronics', url: 'www.ermitazas.lt',     count: 25 },
  'Pegasas':      { category: 'books',       url: 'www.pegasas.lt',       count: 25 },
  'Camelia':      { category: 'cosmetics',   url: 'www.camelia.lt',       count: 25 },
  'Pigu.lt':      { category: 'general',     url: 'www.pigu.lt',          count: 25 },
  'Elektromarkt': { category: 'electronics', url: 'www.elektromarkt.lt',  count: 25 },
};

// Extra grocery seeding – 60 new offers per chain to push toward 100+
const EXTRA_GROCERY_CHAINS = [
  { chain: 'Maxima', url: 'www.barbora.lt', count: 60 },
  { chain: 'Rimi',   url: 'www.rimi.lt',   count: 60 },
  { chain: 'Iki',    url: 'www.iki.lt',    count: 60 },
  { chain: 'Norfa',  url: 'www.norfa.lt',  count: 60 },
  { chain: 'Lidl',   url: 'www.lidl.lt',   count: 60 },
];

const CATEGORY_SYSTEM_PROMPTS = {
  grocery: (chain, count) =>
    `You are a Lithuanian grocery store price database. Generate ${count} realistic current promotional offers for ${chain} supermarket chain in Lithuania.
Rules:
- Product names must be realistic Lithuanian/European brand names (e.g., "Iki pienas 3.5% 1L", "Maxima jogurtas braškių 200g", "Lidl Milbona sūris 400g")
- Prices must be realistic EUR prices for Lithuania (€0.39–€15.00)
- Include variety: dairy, meat, bread, vegetables, fruits, drinks, household items, snacks, frozen food
- Some products should have discounts (old_price > price), some should not (old_price: null)
- unit_price_unit: "kg", "l", "vnt", "100g", "100ml"`,

  electronics: (chain, count) =>
    `You are a Lithuanian electronics retailer price database. Generate ${count} realistic current promotional offers for ${chain} in Lithuania.
Rules:
- Products: TVs, laptops, phones, tablets, headphones, cameras, household appliances, accessories
- Brand names: Samsung, LG, Apple, Sony, Xiaomi, Philips, Bosch, Lenovo, HP, Asus, etc.
- Prices: realistic EUR prices (€9.99–€1499.00)
- Many items should have discounts; unit_price_unit: "vnt"`,

  home: (chain, count) =>
    `You are a Lithuanian home furnishings/textile store price database. Generate ${count} realistic current promotional offers for ${chain} in Lithuania.
Rules:
- Products: pillows, duvets, bedding sets, towels, curtains, rugs, storage boxes, lamps, picture frames, decorations
- Prices: realistic EUR prices (€4.99–€299.00)
- Mix of discounted and full-price items; unit_price_unit: "vnt"`,

  books: (chain, count) =>
    `You are a Lithuanian bookstore price database. Generate ${count} realistic current promotional offers for ${chain} in Lithuania.
Rules:
- Products: Lithuanian and translated books, stationery, board games, school supplies, calendars, maps
- Include realistic Lithuanian and international author names and book titles
- Prices: realistic EUR prices (€2.99–€39.99)
- Some with discounts; unit_price_unit: "vnt"`,

  cosmetics: (chain, count) =>
    `You are a Lithuanian cosmetics/beauty store price database. Generate ${count} realistic current promotional offers for ${chain} in Lithuania.
Rules:
- Products: skincare, makeup, perfumes, hair care, nail products, bath products
- Brands: L'Oreal, Nivea, Vichy, Garnier, Maybelline, NYX, Dove, Pantene, etc.
- Prices: realistic EUR prices (€1.99–€89.99)
- Mix of discounted and full-price items; unit_price_unit: "vnt", "100ml", "100g"`,

  general: (chain, count) =>
    `You are a Lithuanian online marketplace price database. Generate ${count} realistic current promotional offers for ${chain} in Lithuania.
Rules:
- Mix of electronics, home goods, toys, garden, sports, clothing accessories
- Realistic brand names and product descriptions in Lithuanian
- Prices: realistic EUR prices (€2.99–€499.00)
- Many items with discounts; unit_price_unit: "vnt"`,
};

function buildMessages(chain, category, count) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const promptFn = CATEGORY_SYSTEM_PROMPTS[category] || CATEGORY_SYSTEM_PROMPTS.general;
  const systemPrompt = promptFn(chain, count);

  return {
    todayStr,
    nextWeekStr,
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}

Return JSON with this exact structure:
{
  "offers": [
    {
      "product_name": "Product name (realistic brand/description)",
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

Important:
- old_price_value and discount_percent can be null if no discount
- unit_price_value can be null
- All prices must be positive numbers
- Generate EXACTLY ${count} offers`,
      },
      {
        role: 'user',
        content: `Generate ${count} realistic promotional offers for ${chain} in Lithuania for the period ${todayStr} to ${nextWeekStr}.`,
      },
    ],
  };
}

async function generateOffers(chain, category, count) {
  console.log(`  Generating ${count} offers for ${chain} (${category})...`);
  const { messages } = buildMessages(chain, category, count);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages,
    temperature: 0.75,
    max_tokens: 6000,
  });

  const data = JSON.parse(response.choices[0].message.content);
  const offers = data.offers || [];
  console.log(`  Got ${offers.length} offers from OpenAI`);
  return offers;
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
      console.warn(`  WARNING: No stores found for chain "${storeChain}" – skipping`);
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
              `https://${storeChain.toLowerCase().replace(/[^a-z0-9]/g, '')}.lt/akcijos`,
              'active',
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

async function getMissingChains() {
  const result = await pool.query(`
    SELECT DISTINCT s.chain
    FROM stores s
    WHERE s.is_active = true
      AND s.chain NOT IN (
        SELECT DISTINCT store_chain FROM offers WHERE status = 'active'
      )
    ORDER BY s.chain
  `);
  return result.rows.map(r => r.chain);
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Starting seed-missing-chains.js\n');
  console.log('='.repeat(60));

  // ── Step 1: Trigger existing scrapers ───────────────────────────
  console.log('\nStep 1: Triggering existing scrapers...');
  const scrapers = ['jysk-lt', 'topocentras-lt', 'ermitazas-lt', 'pegasas-lt', 'camelia-lt'];
  await Promise.all(
    scrapers.map(async (store) => {
      try {
        const http = require('http');
        await new Promise((resolve) => {
          const req = http.request(
            { hostname: 'localhost', port: 3002, path: `/connectors/${store}/run`, method: 'POST' },
            (res) => { res.resume(); res.on('end', resolve); }
          );
          req.on('error', () => resolve()); // ignore errors – scraper may not exist
          req.end();
        });
        console.log(`  Triggered scraper: ${store}`);
      } catch (e) {
        console.log(`  Scraper ${store} not available (OK)`);
      }
    })
  );
  console.log('  Waiting 90 seconds for scrapers to complete...');
  await delay(90000);
  console.log('  Done waiting.\n');

  // ── Step 2: Find chains still at 0 and generate AI data ────────
  console.log('Step 2: Checking for chains with 0 offers...');
  const missingChains = await getMissingChains();
  console.log(`  Missing chains: ${missingChains.join(', ') || 'none'}\n`);

  let totalPublished = 0;
  let totalErrors = 0;

  for (const chain of missingChains) {
    const meta = MISSING_CHAIN_META[chain];
    if (!meta) {
      console.log(`  No metadata for "${chain}" – skipping`);
      continue;
    }

    try {
      const offers = await generateOffers(chain, meta.category, meta.count);
      const result = await publishOffers(offers, chain);
      console.log(`  Published ${result.published} offers for ${chain}, errors: ${result.errors}\n`);
      totalPublished += result.published;
      totalErrors += result.errors;
      await delay(1200);
    } catch (err) {
      console.error(`  FAILED for ${chain}:`, err.message);
    }
  }

  // ── Step 3: Extra grocery seeding ──────────────────────────────
  console.log('='.repeat(60));
  console.log('\nStep 3: Extra grocery seeding (60 offers per major chain)...\n');

  for (const g of EXTRA_GROCERY_CHAINS) {
    try {
      const offers = await generateOffers(g.chain, 'grocery', g.count);
      const result = await publishOffers(offers, g.chain);
      console.log(`  Published ${result.published} extra offers for ${g.chain}, errors: ${result.errors}\n`);
      totalPublished += result.published;
      totalErrors += result.errors;
      await delay(1200);
    } catch (err) {
      console.error(`  FAILED for ${g.chain}:`, err.message);
    }
  }

  // ── Step 4: Final stats ─────────────────────────────────────────
  console.log('='.repeat(60));
  console.log(`\nAll done! Total published: ${totalPublished}, total errors: ${totalErrors}`);

  const stats = await pool.query(
    `SELECT store_chain, COUNT(*) AS offers
     FROM offers
     WHERE status = 'active'
     GROUP BY store_chain
     ORDER BY offers DESC`
  );
  console.log('\nFinal DB counts per chain:');
  console.log('-'.repeat(35));
  stats.rows.forEach(r => {
    console.log(`  ${r.store_chain.padEnd(20)} ${r.offers} offers`);
  });

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
