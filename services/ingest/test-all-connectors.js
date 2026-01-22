#!/usr/bin/env node

/**
 * Test All Store Connectors
 * Tests each connector to ensure they're working properly
 */

// GROCERY (7)
const maximaConnector = require('./src/connectors/maxima');
const rimiConnector = require('./src/connectors/rimi');
const ikiConnector = require('./src/connectors/iki');
const norfaConnector = require('./src/connectors/norfa');
const silasConnector = require('./src/connectors/silas');
const lidlConnector = require('./src/connectors/lidl');
const aibeConnector = require('./src/connectors/aibe');

// DIY/FURNITURE (4)
const senukaiConnector = require('./src/connectors/senukai');
const mokiveziConnector = require('./src/connectors/mokiveži');
const topocentrasConnector = require('./src/connectors/topocentras');
const jyskConnector = require('./src/connectors/jysk');

// BOOKS (2)
const ermitazasConnector = require('./src/connectors/ermitazas');
const pegasasConnector = require('./src/connectors/pegasas');

// BEAUTY/PHARMACY (4)
const drogasConnector = require('./src/connectors/drogas');
const eurovaistineConnector = require('./src/connectors/eurovaistine');
const gintarineConnector = require('./src/connectors/gintarine');
const cameliaConnector = require('./src/connectors/camelia');

// ELECTRONICS (3)
const varleConnector = require('./src/connectors/varle');
const elektromarktConnector = require('./src/connectors/elektromarkt');
const piguConnector = require('./src/connectors/pigu');

// SPECIALTY (1)
const vynotekaConnector = require('./src/connectors/vynoteka');

const connectors = [
  // Grocery (7)
  { name: 'Maxima', connector: maximaConnector, icon: '🛒', category: 'grocery' },
  { name: 'Rimi', connector: rimiConnector, icon: '🛒', category: 'grocery' },
  { name: 'Iki', connector: ikiConnector, icon: '🛒', category: 'grocery' },
  { name: 'Norfa', connector: norfaConnector, icon: '🛒', category: 'grocery' },
  { name: 'Šilas', connector: silasConnector, icon: '🛒', category: 'grocery' },
  { name: 'Lidl', connector: lidlConnector, icon: '🛒', category: 'grocery' },
  { name: 'Aibė', connector: aibeConnector, icon: '🛒', category: 'grocery' },
  
  // DIY/Furniture (4)
  { name: 'Senukai', connector: senukaiConnector, icon: '🔨', category: 'diy' },
  { name: 'Moki Veži', connector: mokiveziConnector, icon: '🛋️', category: 'furniture' },
  { name: 'Topo Centras', connector: topocentrasConnector, icon: '🏠', category: 'furniture' },
  { name: 'JYSK', connector: jyskConnector, icon: '🛋️', category: 'furniture' },
  
  // Books (2)
  { name: 'Ermitažas', connector: ermitazasConnector, icon: '📚', category: 'books' },
  { name: 'Pegasas', connector: pegasasConnector, icon: '📚', category: 'books' },
  
  // Beauty/Pharmacy (4)
  { name: 'Drogas', connector: drogasConnector, icon: '💄', category: 'beauty' },
  { name: 'Eurovaistinė', connector: eurovaistineConnector, icon: '💊', category: 'pharmacy' },
  { name: 'Gintarinė vaistinė', connector: gintarineConnector, icon: '💊', category: 'pharmacy' },
  { name: 'Camelia', connector: cameliaConnector, icon: '💊', category: 'pharmacy' },
  
  // Electronics (3)
  { name: 'Varle.lt', connector: varleConnector, icon: '💻', category: 'electronics' },
  { name: 'Elektromarkt', connector: elektromarktConnector, icon: '⚡', category: 'electronics' },
  { name: 'Pigu.lt', connector: piguConnector, icon: '🛍️', category: 'electronics' },
  
  // Specialty (1)
  { name: 'Vynoteka', connector: vynotekaConnector, icon: '🍷', category: 'wine' }
];

async function testConnector(name, connector, icon) {
  console.log(`\n${icon} Testing ${name}...`);
  console.log('━'.repeat(50));
  
  try {
    const startTime = Date.now();
    const result = await connector.run();
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${name} SUCCESS`);
    console.log(`   Fetched: ${result.fetched} offers`);
    console.log(`   Duration: ${duration}ms`);
    
    if (result.offers && result.offers.length > 0) {
      console.log(`   Sample: ${result.offers[0].product_name} - €${result.offers[0].price}`);
    }
    
    return {
      name,
      status: 'success',
      fetched: result.fetched,
      duration
    };
  } catch (error) {
    console.error(`❌ ${name} FAILED: ${error.message}`);
    
    return {
      name,
      status: 'failed',
      error: error.message
    };
  }
}

async function testAll() {
  console.log('\n🧪 TESTING ALL STORE CONNECTORS');
  console.log('═'.repeat(50));
  console.log(`Total connectors: ${connectors.length}`);
  console.log('═'.repeat(50));
  
  const results = [];
  
  for (const { name, connector, icon } of connectors) {
    const result = await testConnector(name, connector, icon);
    results.push(result);
    
    // Wait 1 second between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ SUCCESS:');
    successful.forEach(r => {
      console.log(`   ${r.name}: ${r.fetched} offers (${r.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED:');
    failed.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }
  
  const totalOffers = successful.reduce((sum, r) => sum + r.fetched, 0);
  const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
  
  console.log('\n📈 STATISTICS:');
  console.log(`   Total offers: ${totalOffers}`);
  console.log(`   Avg duration: ${Math.round(avgDuration)}ms`);
  console.log('═'.repeat(50));
  
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run tests
testAll().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
