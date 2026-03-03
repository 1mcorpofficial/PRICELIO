const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'receiptradar', password: 'Pr1c3l10_Str0ng_DB_2024!', database: 'receiptradar' });

const CITIES = {
  'Vilnius':   'ef4e0247-6f27-454d-9710-d794d904a066',
  'Kaunas':    'd09e427c-1e9f-41a3-b291-91ddbf62a4fd',
  'Klaipėda':  'e726494b-15cf-470f-9ee3-f3d00c05f637',
  'Šiauliai':  '7e48364e-8d68-40e0-8939-f1c7b2783b4a',
  'Panevėžys': '4f3b4e29-1358-41be-9dc8-bb9fb0ca168b',
};

async function addStore(chain, name, cityId) {
  const res = await pool.query(
    'INSERT INTO stores(id,chain,name,city_id,is_active,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,$3,true,NOW(),NOW()) RETURNING id',
    [chain, name, cityId]
  );
  return res.rows.length > 0;
}

async function main() {
  // Čia Market stores
  const ciaStores = [
    ['Vilnius', 'Čia Market Vilnius'],
    ['Kaunas', 'Čia Market Kaunas'],
    ['Klaipėda', 'Čia Market Klaipėda'],
    ['Šiauliai', 'Čia Market Šiauliai'],
    ['Panevėžys', 'Čia Market Panevėžys'],
  ];
  for (const entry of ciaStores) {
    const city = entry[0];
    const name = entry[1];
    const ok = await addStore('Čia Market', name, CITIES[city]);
    console.log('Čia Market', city, ok ? 'added ✓' : 'skipped');
  }

  // Express Market (convenience chain, ~Kaunas area)
  const expressStores = [
    ['Vilnius', 'Express Market Vilnius'],
    ['Kaunas', 'Express Market Kaunas'],
    ['Klaipėda', 'Express Market Klaipėda'],
  ];
  for (const entry of expressStores) {
    const city = entry[0];
    const name = entry[1];
    const ok = await addStore('Express Market', name, CITIES[city]);
    console.log('Express Market', city, ok ? 'added ✓' : 'skipped');
  }

  const tot = await pool.query('SELECT COUNT(*) FROM stores WHERE is_active=true');
  console.log('\nTotal active stores:', tot.rows[0].count);
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
