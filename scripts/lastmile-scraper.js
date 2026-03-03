/**
 * LastMile.lt scraper - fetches real prices from 199+ chains via internal API
 * No authentication needed, POST to searchservice API
 */
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1', port: 5432,
  user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!',
  database: 'receiptradar',
});

const BASE = 'https://searchservice-952707942140.europe-north1.run.app';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': 'https://www.lastmile.lt',
  'Referer': 'https://www.lastmile.lt/',
};

const today = new Date().toISOString().split('T')[0];

// Lithuanian chains we know about in our DB
const LT_CHAINS_MAP = {
  'IKI':     'CvKfTzV4TN5U8BTMF1Hl',
  'RIMI':    null,  // will find from API
  'NORFA':   null,
  'MAXIMA':  null,
  'LIDL':    null,
};

async function post(path, body) {
  const r = await axios.post(`${BASE}${path}`, body, { headers, timeout: 20000 });
  return r.data;
}

async function getAllChains() {
  const r = await post('/chains', { countryId: 'gCHYvyhpNcKZgcPiDwRV' });
  return r.data || [];
}

async function getProducts(chainId, fromIndex = 0, limit = 200) {
  const r = await post('/v1/frontend-products', {
    params: {
      type: 'view_products', isActive: true, isApproved: true,
      filter: { showOnlyPromoPrices: true },
      sort: 'karma',
      chainIds: [chainId],
      categoryIds: [], isUsingStock: true,
    },
    limit, fromIndex,
  });
  return r.products || [];
}

async function saveToDb(products, chainName, sourceUrl) {
  if (!products.length) return { saved: 0, skipped: 0 };
  const client = await pool.connect();
  let saved = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    const storesRes = await client.query(
      `SELECT id, city_id FROM stores WHERE chain=$1 AND is_active=true`, [chainName]
    );
    if (!storesRes.rows.length) {
      await client.query('ROLLBACK');
      return { saved: 0, skipped: products.length };
    }

    for (const p of products) {
      try {
        const fp = p.frontEndProduct || p;
        const name = fp.name?.lt || fp.name?.en || fp.description?.lt || fp.description?.en;
        const price = fp.prc?.l || fp.prc?.s;
        const oldPrice = fp.prc?.p;
        const validTo = fp.prc?.ltill ? fp.prc.ltill.split('T')[0] : null;
        if (!name || !price || price <= 0) { skipped++; continue; }

        let pid;
        const ex = await client.query(`SELECT id FROM products WHERE LOWER(name)=LOWER($1) LIMIT 1`, [name.trim()]);
        pid = ex.rows.length ? ex.rows[0].id
          : (await client.query(`INSERT INTO products(name,is_active) VALUES($1,true) RETURNING id`, [name.trim()])).rows[0].id;

        for (const store of storesRes.rows) {
          await client.query(
            `INSERT INTO offers(product_id,source_type,store_id,store_chain,city_id,
              price_value,old_price_value,valid_from,valid_to,source_url,status,fetched_at)
             VALUES($1,'online',$2,$3,$4,$5,$6,$7,$8,$9,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31'))
             DO UPDATE SET price_value=$5, old_price_value=$6, fetched_at=NOW(), status='active'`,
            [pid, store.id, chainName, store.city_id,
             parseFloat(price),
             oldPrice && oldPrice > price ? parseFloat(oldPrice) : null,
             today, validTo, sourceUrl]
          );
        }
        saved++;
      } catch { skipped++; }
    }
    await client.query('COMMIT');
    return { saved, skipped };
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

async function main() {
  console.log('🚀 LastMile.lt scraper - all Lithuanian chains\n');

  // Get all chains and find Lithuanian ones
  const allChains = await getAllChains();
  console.log(`Found ${allChains.length} total chains in lastmile`);

  // Print all chains to identify Lithuanian ones
  console.log('\nAll chains:');
  allChains.forEach(c => {
    const name = c.title || c.name?.lt || c.name?.en || JSON.stringify(c.name || '');
    console.log(`  ${c.id} | ${name}`);
  });

  // Find chains that match our DB stores
  const dbChains = await pool.query(`SELECT DISTINCT chain FROM stores WHERE is_active=true`);
  const dbChainNames = dbChains.rows.map(r => r.chain.toLowerCase());
  console.log('\nOur DB chains:', dbChainNames);

  let totalSaved = 0;
  for (const chain of allChains) {
    const chainName = chain.title || chain.name?.lt || chain.name?.en || '';
    const matched = dbChainNames.find(db =>
      chainName.toLowerCase().includes(db) || db.includes(chainName.toLowerCase().split(' ')[0])
    );
    if (!matched) continue;

    const dbName = matched.charAt(0).toUpperCase() + matched.slice(1);
    console.log(`\n📦 Scraping ${chainName} (matched: ${dbName}) [ID: ${chain.id}]`);

    try {
      // Fetch with pagination
      let allProducts = [];
      let fromIndex = 0;
      while (true) {
        const batch = await getProducts(chain.id, fromIndex, 200);
        if (!batch.length) break;
        allProducts = allProducts.concat(batch);
        if (batch.length < 200) break;
        fromIndex += 200;
        await new Promise(r => setTimeout(r, 500));
      }
      console.log(`  Found ${allProducts.length} promo products`);

      const r = await saveToDb(allProducts, dbName, 'https://lastmile.lt/chain/' + chainName);
      console.log(`  ✅ Saved: ${r.saved} | Skipped: ${r.skipped}`);
      totalSaved += r.saved;
    } catch(e) { console.log(`  ❌ Error: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Total saved: ${totalSaved}`);
  const tot = await pool.query(`SELECT COUNT(*) FROM offers WHERE status='active'`);
  console.log(`📦 Total active offers in DB: ${tot.rows[0].count}`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
