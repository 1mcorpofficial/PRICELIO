/**
 * PRICELIO Price Collector Scheduler
 * Runs all store connectors every 6 hours to collect fresh prices via OpenAI
 */
require('dotenv').config();

const rimi   = require('./src/connectors/rimi');
const iki    = require('./src/connectors/iki');
const lidl   = require('./src/connectors/lidl');
const norfa  = require('./src/connectors/norfa');
const fs     = require('fs');
const path   = require('path');

const CONNECTORS = [rimi, iki, lidl, norfa];

['aibe', 'silas', 'maxima'].forEach(function(name) {
  var p = path.join(__dirname, 'src/connectors', name + '.js');
  if (fs.existsSync(p)) {
    try { CONNECTORS.push(require(p)); } catch(e) { console.warn('Skip ' + name + ':', e.message); }
  }
});

async function runAll() {
  var started = new Date().toISOString();
  console.log('\n=== Price collection started ' + started + ' ===');

  for (var i = 0; i < CONNECTORS.length; i++) {
    var connector = CONNECTORS[i];
    var name = connector.storeName || connector.name || 'unknown';
    try {
      console.log('[' + name + '] Starting...');
      var result = await connector.run();
      var cnt = 'ok';
      if (result !== null && result !== undefined) {
        if (result.offersPublished !== undefined) cnt = result.offersPublished;
        else if (result.count !== undefined) cnt = result.count;
      }
      console.log('[' + name + '] Done:', cnt);
    } catch (err) {
      console.error('[' + name + '] Error:', err.message);
    }
    await new Promise(function(r) { setTimeout(r, 3000); });
  }

  console.log('=== Collection finished ' + new Date().toISOString() + ' ===\n');
}

// Run immediately on start
runAll().catch(console.error);

// Then every 6 hours
var SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(function() { runAll().catch(console.error); }, SIX_HOURS);

console.log('Price collector scheduler running. Next run in 6 hours.');
