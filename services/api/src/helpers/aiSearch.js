const axios = require('axios');
const OpenAI = require('openai');
const { query } = require('../db');

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LASTMILE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': 'https://www.lastmile.lt',
  'Referer': 'https://www.lastmile.lt/',
};

async function aiSearchIki(q) {
  const resp = await axios.post(
    'https://searchservice-952707942140.europe-north1.run.app/v1/frontend-products',
    {
      params: {
        type: 'view_products', isActive: true, isApproved: true,
        filter: { showOnlyPromoPrices: false },
        sort: 'karma',
        chainIds: ['CvKfTzV4TN5U8BTMF1Hl'],
        categoryIds: [], isUsingStock: true,
      },
      limit: 200, fromIndex: 0,
    },
    { headers: LASTMILE_HEADERS, timeout: 14000 }
  );
  const products = resp.data?.products || [];
  const qLow = q.toLowerCase();
  let best = null;
  for (const p of products) {
    const fp = p.frontEndProduct || p;
    const name = fp.name?.lt || fp.name?.en || fp.description?.lt || '';
    if (!name.toLowerCase().includes(qLow.split(' ')[0])) continue;
    const price = Number(fp.prc?.l || fp.prc?.s || 0);
    if (price > 0 && (!best || price < best.price)) best = { chain: 'IKI', price, name };
  }
  return best;
}

async function aiSearchViaGpt(chainsToSearch, q) {
  const chainList = chainsToSearch.join(', ');
  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a Lithuanian grocery price expert. You know typical retail prices at major Lithuanian chains.' },
      { role: 'user', content: `What is the typical retail price (not promotional) of "${q}" at these Lithuanian grocery stores: ${chainList}?\nReturn JSON: {"results": [{"chain": "Maxima", "price": 1.23, "name": "exact product name in Lithuanian"}, ...]}\nOnly include chains where you are reasonably confident. Omit if unknown. Prices in euros. Be accurate — use realistic 2024-2025 Lithuanian market prices.` }
    ],
    max_tokens: 200,
    response_format: { type: 'json_object' },
    temperature: 0,
  });
  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  return Array.isArray(parsed.results) ? parsed.results : [];
}

async function batchVerifyPrices(productName, foundPrices) {
  if (!foundPrices.length) return [];
  const priceList = foundPrices.map((p) => `${p.chain}: €${p.price.toFixed(2)}`).join(', ');
  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `Are these Lithuanian grocery store prices for "${productName}" realistic for 2024-2025?\n${priceList}\nReturn JSON: {"verified": [{"chain": "Maxima", "realistic": true, "price": 1.23}, ...]}\nOnly include chains from the input. Mark realistic=false if price seems clearly wrong.` }],
    max_tokens: 200,
    response_format: { type: 'json_object' },
    temperature: 0,
  });
  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  return Array.isArray(parsed.verified) ? parsed.verified : [];
}

async function saveVerifiedPrice(productName, chain, price) {
  try {
    const storeRes = await query(`SELECT id, city_id FROM stores WHERE chain = $1 AND is_active = true LIMIT 1`, [chain]);
    if (!storeRes.rows.length) return;
    const store = storeRes.rows[0];
    const existingProd = await query(`SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1`, [productName]);
    let productId;
    if (existingProd.rows.length) {
      productId = existingProd.rows[0].id;
    } else {
      const newProd = await query(`INSERT INTO products (name, is_active) VALUES ($1, true) RETURNING id`, [productName]);
      productId = newProd.rows[0].id;
    }
    await query(
      `INSERT INTO offers (product_id, source_type, store_id, store_chain, city_id, price_value, is_verified, status, fetched_at)
       VALUES ($1, 'online', $2, $3, $4, $5, true, 'active', NOW())
       ON CONFLICT ON CONSTRAINT offers_dedup_idx DO NOTHING`,
      [productId, store.id, chain, store.city_id, price]
    );
  } catch (err) {
    console.error('[ai-search] saveVerifiedPrice failed:', err.message?.slice(0, 80));
  }
}

module.exports = { aiSearchIki, aiSearchViaGpt, batchVerifyPrices, saveVerifiedPrice };
