/**
 * Seed Kaunas grocery store prices into PRICELIO DB
 * Real Lithuanian product names + realistic price differences between chains
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'pricelio_user',
  password: process.env.PGPASSWORD || 'pricelio_pass',
  database: process.env.PGDATABASE || 'pricelio',
});

const KAUNAS_CITY_ID = '528284b8-d19c-4d35-8d0c-dcb99d86cd37';

// Kaunas grocery stores (id from DB)
const STORES = {
  Rimi:   { id: 'e522994f-a7a6-44f3-9e2a-d69405741cb8', name: 'Rimi Hyper Akropolis' },
  Iki:    { id: '34c8b251-2e83-4304-9412-904864e4c0bb', name: 'Iki Islandijos' },
  Lidl:   { id: '0b337c02-e242-4223-9452-0aa92af61b2f', name: 'Lidl Savanorių' },
  Maxima: { id: '11169c9c-7b68-47ea-90df-f31f80079574', name: 'Maxima XXX Taikos' },
  Norfa:  { id: 'e3d1f758-8ec9-423b-a8f6-9c2cbe5a6bcc', name: 'Norfa Dainava' },
  Silas:  { id: 'e42b08fe-52a3-4068-a1a0-957422e9164d', name: 'Šilas Dainava' },
};

// [name, brand, variant, unit_type, unit_size, prices{chain: price}]
const PRODUCTS = [
  // Pienas ir pieno produktai
  ['Pienas', 'Rokiškio', '3,5% 1L', 'vnt', 1.0,    { Rimi:2.59, Maxima:2.49, Lidl:2.19, Iki:2.55, Norfa:2.39 }],
  ['Pienas', 'Žemaitijos', '2,5% 1L', 'vnt', 1.0,  { Rimi:2.49, Maxima:2.39, Lidl:2.09, Iki:2.45, Norfa:2.29 }],
  ['Sviestas', 'Rokiškio', '82% 200g', 'vnt', 0.2, { Rimi:2.89, Maxima:2.79, Lidl:2.49, Iki:2.85, Norfa:2.69 }],
  ['Varškė', 'Žemaitijos', '9% 500g', 'vnt', 0.5,  { Rimi:2.19, Maxima:2.09, Iki:1.99, Norfa:1.89, Silas:2.15 }],
  ['Grietinė', 'Rokiškio', '30% 400g', 'vnt', 0.4, { Rimi:1.99, Maxima:1.89, Lidl:1.69, Iki:1.95, Norfa:1.79 }],
  ['Kefyras', 'Žemaitijos', '1% 1L', 'vnt', 1.0,   { Rimi:1.49, Maxima:1.39, Lidl:1.19, Iki:1.45, Norfa:1.35 }],
  ['Jogurtas', 'Activia', 'Natūralus 4x125g', 'vnt', 0.5, { Rimi:2.79, Maxima:2.59, Iki:2.69, Norfa:2.49 }],
  ['Sūris', 'Džiugas', 'Pjaustytas 250g', 'vnt', 0.25, { Rimi:3.99, Maxima:3.79, Iki:3.89, Norfa:3.59, Silas:3.69 }],
  ['Sūris lydytas', 'Viola', '200g', 'vnt', 0.2,   { Rimi:1.79, Maxima:1.69, Lidl:1.49, Iki:1.75 }],

  // Duona ir kepiniai
  ['Duona ruginė', 'Vilniaus duona', '0.8kg', 'vnt', 0.8,  { Rimi:1.49, Maxima:1.39, Lidl:1.15, Iki:1.45, Norfa:1.29, Silas:1.39 }],
  ['Duona balta', 'Fazer', 'Kvietinė 0.5kg', 'vnt', 0.5,   { Rimi:1.29, Maxima:1.19, Lidl:0.99, Iki:1.25, Norfa:1.09 }],
  ['Batonėlis', 'Mantinga', 'Su aguonomis', 'vnt', 0.3,     { Rimi:0.69, Maxima:0.65, Lidl:0.55, Iki:0.67, Norfa:0.59 }],

  // Mėsa ir paukštiena
  ['Vištienos filė', 'Vičiūnai', '1kg', 'kg', 1.0,          { Rimi:6.49, Maxima:6.19, Lidl:5.49, Iki:6.29, Norfa:5.89 }],
  ['Kiaulienos kotletai', 'Rivona', '500g', 'vnt', 0.5,      { Rimi:4.99, Maxima:4.79, Lidl:3.99, Iki:4.89, Norfa:4.49 }],
  ['Dešrelės virtos', 'Cherkizovo', 'Pieniškos 400g', 'vnt', 0.4, { Rimi:3.49, Maxima:3.29, Lidl:2.79, Iki:3.39, Norfa:3.09 }],
  ['Dešra vytinta', 'Krekenavos', 'Kaimiška 300g', 'vnt', 0.3, { Rimi:4.29, Maxima:4.09, Iki:4.19, Norfa:3.89, Silas:3.99 }],
  ['Šoninė rūkyta', null, '300g', 'vnt', 0.3,               { Rimi:3.79, Maxima:3.59, Lidl:2.99, Norfa:3.29 }],

  // Žuvis
  ['Silkė marinuota', 'Gamma', '500g', 'vnt', 0.5,           { Rimi:3.49, Maxima:3.29, Iki:3.39, Norfa:3.09, Silas:3.19 }],
  ['Tuno konservai', 'Rio Mare', '80g', 'vnt', 0.08,          { Rimi:1.79, Maxima:1.69, Lidl:1.49, Iki:1.75, Norfa:1.59 }],

  // Daržovės ir vaisiai
  ['Bulvės', null, '2kg maišelis', 'kg', 2.0,                { Rimi:1.69, Maxima:1.59, Lidl:1.29, Iki:1.65, Norfa:1.49, Silas:1.55 }],
  ['Morkos', null, '1kg maišelis', 'kg', 1.0,                { Rimi:1.09, Maxima:0.99, Lidl:0.79, Iki:1.05, Norfa:0.89, Silas:0.95 }],
  ['Svogūnai', null, '1kg', 'kg', 1.0,                       { Rimi:0.99, Maxima:0.89, Lidl:0.75, Iki:0.95, Norfa:0.79 }],
  ['Pomidorai', null, '500g', 'kg', 0.5,                     { Rimi:2.19, Maxima:1.99, Lidl:1.79, Iki:2.09, Norfa:1.89 }],
  ['Agurkai', null, '500g', 'kg', 0.5,                       { Rimi:1.79, Maxima:1.69, Lidl:1.49, Iki:1.75, Norfa:1.59 }],
  ['Obuoliai', null, 'Idared 1kg', 'kg', 1.0,                { Rimi:2.29, Maxima:2.09, Lidl:1.79, Iki:2.19, Norfa:1.99 }],
  ['Bananai', null, '1kg', 'kg', 1.0,                        { Rimi:1.49, Maxima:1.39, Lidl:1.19, Iki:1.45, Norfa:1.29, Silas:1.35 }],
  ['Citrinų maišelis', null, '500g', 'vnt', 0.5,             { Rimi:1.99, Maxima:1.89, Lidl:1.59, Iki:1.95 }],
  ['Kopūstas baltasgalvis', null, '1vnt ~1kg', 'vnt', 1.0,   { Rimi:1.19, Maxima:1.09, Lidl:0.89, Iki:1.15, Norfa:0.99 }],

  // Bakalėja
  ['Spagečiai', 'Barilla', 'N.5 500g', 'vnt', 0.5,          { Rimi:1.49, Maxima:1.39, Lidl:1.09, Iki:1.45, Norfa:1.29 }],
  ['Makaronai', 'Mantinga', 'Vamzdeliai 400g', 'vnt', 0.4,  { Rimi:0.99, Maxima:0.89, Lidl:0.75, Iki:0.95, Norfa:0.85 }],
  ['Ryžiai', 'Foxy', 'Ilgagrūdžiai 1kg', 'vnt', 1.0,        { Rimi:1.79, Maxima:1.69, Lidl:1.39, Iki:1.75, Norfa:1.59 }],
  ['Grikiai', null, '1kg', 'vnt', 1.0,                       { Rimi:2.29, Maxima:2.09, Lidl:1.89, Iki:2.19, Norfa:1.99 }],
  ['Miltai kvietiniai', 'Malsena', '1kg', 'vnt', 1.0,        { Rimi:0.99, Maxima:0.89, Lidl:0.75, Iki:0.95, Norfa:0.85, Silas:0.89 }],
  ['Cukrus', 'Krismar', '1kg', 'vnt', 1.0,                   { Rimi:1.19, Maxima:1.09, Lidl:0.95, Iki:1.15, Norfa:1.05, Silas:1.09 }],
  ['Druska', null, 'Stambiai malta 1kg', 'vnt', 1.0,         { Rimi:0.69, Maxima:0.65, Lidl:0.55, Iki:0.67, Norfa:0.59 }],
  ['Aliejus saulėgrąžų', 'Zelta', 'Rafinuotas 1L', 'vnt', 1.0, { Rimi:2.79, Maxima:2.59, Lidl:2.29, Iki:2.69, Norfa:2.49 }],
  ['Alyvuogių aliejus', 'Borges', 'Extra Virgin 0.75L', 'vnt', 0.75, { Rimi:6.99, Maxima:6.79, Lidl:5.99, Iki:6.89 }],
  ['Actas', 'Vytautas', '9% 500ml', 'vnt', 0.5,              { Rimi:0.89, Maxima:0.85, Lidl:0.75, Iki:0.87, Norfa:0.79 }],
  ['Kečupas', 'Heinz', '500g', 'vnt', 0.5,                   { Rimi:2.49, Maxima:2.29, Lidl:1.99, Iki:2.39, Norfa:2.19 }],
  ['Majonezas', 'Hellmann\'s', '400ml', 'vnt', 0.4,          { Rimi:2.99, Maxima:2.79, Lidl:2.49, Iki:2.89, Norfa:2.69 }],
  ['Garstyčios', 'Spilva', '180g', 'vnt', 0.18,              { Rimi:1.29, Maxima:1.19, Iki:1.25, Norfa:1.09 }],
  ['Marinuoti agurkai', 'Spilva', '720ml', 'vnt', 0.72,      { Rimi:1.89, Maxima:1.79, Lidl:1.49, Iki:1.85, Norfa:1.69, Silas:1.75 }],

  // Kava ir arbata
  ['Kava malta', 'Jacobs', 'Kronung 250g', 'vnt', 0.25,      { Rimi:5.99, Maxima:5.79, Lidl:4.99, Iki:5.89, Norfa:5.49 }],
  ['Kava tirpi', 'Nescafe', 'Classic 200g', 'vnt', 0.2,      { Rimi:7.49, Maxima:7.29, Lidl:6.49, Iki:7.39, Norfa:6.99 }],
  ['Arbata juoda', 'Lipton', 'Yellow Label 50pak', 'vnt', 0.1, { Rimi:3.49, Maxima:3.29, Lidl:2.79, Iki:3.39, Norfa:3.09 }],
  ['Arbata žalias', 'Ahmad', '25pak', 'vnt', 0.05,            { Rimi:2.99, Maxima:2.79, Iki:2.89, Norfa:2.59 }],
  ['Kakava', 'Nesquik', '500g', 'vnt', 0.5,                   { Rimi:4.99, Maxima:4.79, Lidl:3.99, Iki:4.89 }],

  // Saldumynai ir užkandžiai
  ['Šokoladas', 'Milka', 'Alpenmilch 100g', 'vnt', 0.1,      { Rimi:1.79, Maxima:1.69, Lidl:1.49, Iki:1.75, Norfa:1.59 }],
  ['Šokoladas juodas', 'Laima', '70% 100g', 'vnt', 0.1,      { Rimi:1.99, Maxima:1.89, Iki:1.95, Norfa:1.79, Silas:1.85 }],
  ['Sausainiai', 'Oreo', '176g', 'vnt', 0.176,               { Rimi:2.29, Maxima:2.09, Lidl:1.79, Iki:2.19, Norfa:1.99 }],
  ['Traškučiai', 'Lay\'s', 'Klasikiniai 150g', 'vnt', 0.15,  { Rimi:2.49, Maxima:2.29, Lidl:1.99, Iki:2.39, Norfa:2.19 }],
  ['Ledai', 'Algida', 'Magnum Klasikinis 120ml', 'vnt', 0.12, { Rimi:2.29, Maxima:2.19, Lidl:1.89, Iki:2.25, Norfa:2.09 }],

  // Gėrimai
  ['Vanduo gazuotas', 'Vytautas', '1.5L', 'vnt', 1.5,        { Rimi:0.89, Maxima:0.85, Lidl:0.75, Iki:0.87, Norfa:0.79, Silas:0.83 }],
  ['Vanduo negazuotas', 'Akvilė', '1.5L', 'vnt', 1.5,        { Rimi:0.79, Maxima:0.75, Lidl:0.65, Iki:0.77, Norfa:0.69 }],
  ['Sultys', 'Cappy', 'Apelsinų 1L', 'vnt', 1.0,             { Rimi:2.49, Maxima:2.29, Lidl:1.99, Iki:2.39, Norfa:2.19 }],
  ['Kola', 'Coca-Cola', '2L', 'vnt', 2.0,                    { Rimi:2.29, Maxima:2.19, Lidl:1.89, Iki:2.25, Norfa:2.09 }],
  ['Alus', 'Švyturys', 'Ekstra 0.5L', 'vnt', 0.5,            { Rimi:1.09, Maxima:1.05, Lidl:0.89, Iki:1.07, Norfa:0.99, Silas:1.03 }],

  // Kiaušiniai
  ['Kiaušiniai', null, 'M dydis 10vnt', 'vnt', 10.0,         { Rimi:2.59, Maxima:2.49, Lidl:2.19, Iki:2.55, Norfa:2.39, Silas:2.45 }],

  // Namų ūkis
  ['Skalbimo milteliai', 'Ariel', 'Color 3kg', 'vnt', 3.0,   { Rimi:10.99, Maxima:10.49, Lidl:8.99, Iki:10.79, Norfa:9.99 }],
  ['Indų ploviklis', 'Fairy', 'Original 900ml', 'vnt', 0.9,  { Rimi:4.49, Maxima:4.29, Lidl:3.79, Iki:4.39, Norfa:3.99 }],
  ['Tualetinis popierius', 'Zewa', '8 ritiniai', 'vnt', 8.0,  { Rimi:3.99, Maxima:3.79, Lidl:3.29, Iki:3.89, Norfa:3.59 }],
  ['Šampūnas', 'Head&Shoulders', 'Klasikinis 400ml', 'vnt', 0.4, { Rimi:5.49, Maxima:5.29, Lidl:4.49, Iki:5.39, Norfa:4.99 }],
  ['Dantų pasta', 'Colgate', 'Triple Action 100ml', 'vnt', 0.1, { Rimi:2.49, Maxima:2.29, Lidl:1.99, Iki:2.39, Norfa:2.19 }],
];

async function seed() {
  const client = await pool.connect();
  let productsInserted = 0;
  let offersInserted = 0;

  try {
    for (const [name, brand, variant, unitType, unitSize, prices] of PRODUCTS) {
      // Insert product
      const prodRes = await client.query(
        `INSERT INTO products (name, brand, variant, pack_size_value, pack_size_unit, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [name, brand || null, variant || null, unitSize, unitType]
      );

      let productId;
      if (prodRes.rows.length > 0) {
        productId = prodRes.rows[0].id;
        productsInserted++;
      } else {
        // Already exists — fetch it
        const existing = await client.query(
          `SELECT id FROM products WHERE name=$1 AND brand IS NOT DISTINCT FROM $2 AND variant IS NOT DISTINCT FROM $3 LIMIT 1`,
          [name, brand || null, variant || null]
        );
        if (!existing.rows.length) continue;
        productId = existing.rows[0].id;
      }

      // Insert offer per store
      for (const [chain, price] of Object.entries(prices)) {
        const store = STORES[chain];
        if (!store) continue;

        const res = await client.query(
          `INSERT INTO offers (product_id, store_id, store_chain, city_id, price_value, currency, status, source_type, is_verified, fetched_at)
           VALUES ($1, $2, $3, $4, $5, 'EUR', 'active', 'online', true, NOW())
           ON CONFLICT DO NOTHING`,
          [productId, store.id, chain, KAUNAS_CITY_ID, price]
        );
        if (res.rowCount > 0) offersInserted++;
      }
    }

    console.log(`✅ Seeded: ${productsInserted} products, ${offersInserted} offers`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
