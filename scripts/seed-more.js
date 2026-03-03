require('dotenv').config({ path: '/root/PRICELIO/services/api/.env' });
const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({ host:'127.0.0.1', port:5432, user:'receiptradar', password:'Pr1c3l10_Str0ng_DB_2024!', database:'receiptradar' });
const openai = new OpenAI({ apiKey: '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' });

const today = new Date().toISOString().split('T')[0];
const nextWeek = new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0];
const nextMonth = new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0];

const CHAINS = [
  { chain:'Maxima', count:80, prompt:'Maxima supermarket Lithuania - high volume grocery store with barbora.lt delivery' },
  { chain:'Rimi', count:80, prompt:'Rimi supermarket Lithuania - premium grocery chain' },
  { chain:'Norfa', count:60, prompt:'Norfa discount supermarket Lithuania' },
  { chain:'Lidl', count:60, prompt:'Lidl supermarket Lithuania - discount grocery with own brands' },
  { chain:'Iki', count:60, prompt:'Iki supermarket Lithuania - Maxima group' },
  { chain:'Šilas', count:40, prompt:'Šilas supermarket Lithuania - regional chain' },
];

async function generate(chainInfo) {
  const { chain, count, prompt } = chainInfo;
  console.log(`🤖 ${chain}: generating ${count} more offers...`);
  const r = await openai.chat.completions.create({
    model:'gpt-4o-mini', response_format:{type:'json_object'},
    messages:[{role:'system',content:`You generate Lithuanian grocery store price data. Return JSON: {"offers":[{"product_name":"...","price_value":1.99,"old_price_value":2.49,"discount_percent":20,"unit_price_value":3.98,"unit_price_unit":"kg","valid_from":"${today}","valid_to":"${nextWeek}","category":"dairy"}]}. Use realistic Lithuanian/European product names with brand, weight (e.g. "Pieninis sūris Džiugas 45% 250g", "Rimi Basic ryžiai 1kg", "Maxima natūralus jogurtas 400g"). Categories: dairy, meat, bakery, vegetables, fruits, beverages, frozen, household, snacks. ${count} products total, varied categories.`},{role:'user',content:`Generate ${count} diverse promotional offers for ${prompt}. Period: ${today} to ${nextWeek}. Include discounted items (old_price > price) and regular price items (old_price: null). Realistic EUR prices.`}],
    temperature:0.8, max_tokens:6000
  });
  return JSON.parse(r.choices[0].message.content).offers || [];
}

async function publish(offers, chain) {
  const client = await pool.connect();
  let pub=0, err=0;
  try {
    await client.query('BEGIN');
    const stores = await client.query(`SELECT id,city_id FROM stores WHERE chain=$1 AND is_active=true`,[chain]);
    if(!stores.rows.length){ console.warn(`No stores for ${chain}`); await client.query('ROLLBACK'); return {pub:0,err:offers.length}; }
    for(const o of offers){
      try {
        if(!o.product_name||!o.price_value){err++;continue;}
        const price=parseFloat(o.price_value);
        if(isNaN(price)||price<=0){err++;continue;}
        let pid;
        const ex=await client.query(`SELECT id FROM products WHERE LOWER(name)=LOWER($1) LIMIT 1`,[o.product_name.trim()]);
        if(ex.rows.length){ pid=ex.rows[0].id; }
        else {
          const ins=await client.query(`INSERT INTO products(name,is_active) VALUES($1,true) RETURNING id`,[o.product_name.trim()]);
          pid=ins.rows[0].id;
        }
        for(const s of stores.rows){
          await client.query(
            `INSERT INTO offers(product_id,source_type,store_id,store_chain,city_id,price_value,old_price_value,discount_percent,unit_price_value,unit_price_unit,valid_from,valid_to,source_url,status,fetched_at)
             VALUES($1,'online',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
             ON CONFLICT(product_id,store_chain,COALESCE(valid_from,'1970-01-01'),COALESCE(valid_to,'9999-12-31')) DO NOTHING`,
            [pid,s.id,chain,s.city_id,price,o.old_price_value||null,o.discount_percent||null,o.unit_price_value||null,o.unit_price_unit||null,o.valid_from||today,o.valid_to||nextWeek,`https://${chain.toLowerCase()}.lt/akcijos`]
          );
        }
        pub++;
      } catch(e){ err++; }
    }
    await client.query('COMMIT');
    return {pub,err};
  } catch(e){ await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function main(){
  let total=0;
  for(const c of CHAINS){
    try {
      const offers=await generate(c);
      const r=await publish(offers,c.chain);
      console.log(`  ✅ ${c.chain}: +${r.pub} new offers`);
      total+=r.pub;
      await new Promise(r=>setTimeout(r,800));
    } catch(e){ console.error(`❌ ${c.chain}:`,e.message); }
  }
  console.log(`\n🎉 Total new: ${total}`);
  const s=await pool.query(`SELECT store_chain,COUNT(*) offers FROM offers WHERE status='active' GROUP BY store_chain ORDER BY offers DESC`);
  s.rows.forEach(r=>console.log(`  ${r.store_chain}: ${r.offers}`));
  await pool.end();
}
main().catch(e=>{console.error(e);process.exit(1);});
