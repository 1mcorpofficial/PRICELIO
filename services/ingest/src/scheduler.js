// GROCERY STORES (7)
const maximaConnector = require('./connectors/maxima');
const rimiConnector = require('./connectors/rimi');
const ikiConnector = require('./connectors/iki');
const norfaConnector = require('./connectors/norfa');
const silasConnector = require('./connectors/silas');
const lidlConnector = require('./connectors/lidl');
const aibeConnector = require('./connectors/aibe');

// DIY/HARDWARE/FURNITURE (4)
const senukaiConnector = require('./connectors/senukai');
const mokiveziConnector = require('./connectors/mokiveži');
const topocentrasConnector = require('./connectors/topocentras');
const jyskConnector = require('./connectors/jysk');

// BOOKS (2)
const ermitazasConnector = require('./connectors/ermitazas');
const pegasasConnector = require('./connectors/pegasas');

// BEAUTY/PHARMACY (4)
const drogasConnector = require('./connectors/drogas');
const eurovaistineConnector = require('./connectors/eurovaistine');
const gintarineConnector = require('./connectors/gintarine');
const cameliaConnector = require('./connectors/camelia');

// ELECTRONICS (3)
const varleConnector = require('./connectors/varle');
const elektromarktConnector = require('./connectors/elektromarkt');
const piguConnector = require('./connectors/pigu');

// SPECIALTY (1)
const vynotekaConnector = require('./connectors/vynoteka');

const connectors = [
  // GROCERY STORES
  {
    id: 'maxima-lt',
    name: 'Maxima (Lithuania)',
    chain: 'Maxima',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 6 * * *', // Daily at 6 AM
    connector: maximaConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'rimi-lt',
    name: 'Rimi (Lithuania)',
    chain: 'Rimi',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 7 * * *', // Daily at 7 AM
    connector: rimiConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'iki-lt',
    name: 'Iki (Lithuania)',
    chain: 'Iki',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 8 * * *', // Daily at 8 AM
    connector: ikiConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'norfa-lt',
    name: 'Norfa (Lithuania)',
    chain: 'Norfa',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 9 * * *', // Daily at 9 AM
    connector: norfaConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'silas-lt',
    name: 'Šilas (Lithuania)',
    chain: 'Šilas',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 10 * * *', // Daily at 10 AM
    connector: silasConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'lidl-lt',
    name: 'Lidl (Lithuania)',
    chain: 'Lidl',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 11 * * *', // Daily at 11 AM
    connector: lidlConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'aibe-lt',
    name: 'Aibė (Lithuania)',
    chain: 'Aibė',
    type: 'flyer',
    category: 'grocery',
    enabled: true,
    schedule: '0 12 * * *', // Daily at 12 PM
    connector: aibeConnector,
    lastRun: null,
    lastStatus: null
  },
  
  // DIY/HARDWARE/FURNITURE STORES
  {
    id: 'senukai-lt',
    name: 'Senukai (Lithuania)',
    chain: 'Senukai',
    type: 'flyer',
    category: 'diy',
    enabled: true,
    schedule: '0 6 * * 1', // Monday at 6 AM
    connector: senukaiConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'mokivezi-lt',
    name: 'Moki Veži (Lithuania)',
    chain: 'Moki Veži',
    type: 'flyer',
    category: 'diy',
    enabled: true,
    schedule: '0 7 * * 1', // Monday at 7 AM
    connector: mokiveziConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'topocentras-lt',
    name: 'Topo Centras (Lithuania)',
    chain: 'Topo Centras',
    type: 'flyer',
    category: 'furniture',
    enabled: true,
    schedule: '0 8 * * 1', // Monday at 8 AM
    connector: topocentrasConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'jysk-lt',
    name: 'JYSK (Lithuania)',
    chain: 'JYSK',
    type: 'flyer',
    category: 'furniture',
    enabled: true,
    schedule: '0 9 * * 1', // Monday at 9 AM
    connector: jyskConnector,
    lastRun: null,
    lastStatus: null
  },
  
  // SPECIALTY STORES
  {
    id: 'ermitazas-lt',
    name: 'Ermitažas (Lithuania)',
    chain: 'Ermitažas',
    type: 'online',
    category: 'books',
    enabled: true,
    schedule: '0 10 * * 1', // Monday at 10 AM
    connector: ermitazasConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'pegasas-lt',
    name: 'Pegasas (Lithuania)',
    chain: 'Pegasas',
    type: 'online',
    category: 'books',
    enabled: true,
    schedule: '0 11 * * 1', // Monday at 11 AM
    connector: pegasasConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'drogas-lt',
    name: 'Drogas (Lithuania)',
    chain: 'Drogas',
    type: 'flyer',
    category: 'beauty',
    enabled: true,
    schedule: '0 6 * * 2', // Tuesday at 6 AM
    connector: drogasConnector,
    lastRun: null,
    lastStatus: null
  },
  
  // PHARMACY STORES
  {
    id: 'eurovaistine-lt',
    name: 'Eurovaistinė (Lithuania)',
    chain: 'Eurovaistinė',
    type: 'online',
    category: 'pharmacy',
    enabled: true,
    schedule: '0 7 * * 2', // Tuesday at 7 AM
    connector: eurovaistineConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'gintarine-lt',
    name: 'Gintarinė vaistinė (Lithuania)',
    chain: 'Gintarinė vaistinė',
    type: 'online',
    category: 'pharmacy',
    enabled: true,
    schedule: '0 8 * * 2', // Tuesday at 8 AM
    connector: gintarineConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'camelia-lt',
    name: 'Camelia (Lithuania)',
    chain: 'Camelia',
    type: 'online',
    category: 'pharmacy',
    enabled: true,
    schedule: '0 9 * * 2', // Tuesday at 9 AM
    connector: cameliaConnector,
    lastRun: null,
    lastStatus: null
  },
  
  // ELECTRONICS STORES
  {
    id: 'varle-lt',
    name: 'Varle.lt (Lithuania)',
    chain: 'Varle.lt',
    type: 'online',
    category: 'electronics',
    enabled: true,
    schedule: '0 10 * * 2', // Tuesday at 10 AM
    connector: varleConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'elektromarkt-lt',
    name: 'Elektromarkt (Lithuania)',
    chain: 'Elektromarkt',
    type: 'online',
    category: 'electronics',
    enabled: true,
    schedule: '0 11 * * 2', // Tuesday at 11 AM
    connector: elektromarktConnector,
    lastRun: null,
    lastStatus: null
  },
  {
    id: 'pigu-lt',
    name: 'Pigu.lt (Lithuania)',
    chain: 'Pigu.lt',
    type: 'online',
    category: 'electronics',
    enabled: true,
    schedule: '0 12 * * 2', // Tuesday at 12 PM
    connector: piguConnector,
    lastRun: null,
    lastStatus: null
  },
  
  // SPECIALTY - WINE & SPIRITS
  {
    id: 'vynoteka-lt',
    name: 'Vynoteka (Lithuania)',
    chain: 'Vynoteka',
    type: 'online',
    category: 'wine',
    enabled: true,
    schedule: '0 6 * * 3', // Wednesday at 6 AM
    connector: vynotekaConnector,
    lastRun: null,
    lastStatus: null
  }
];

function getAllConnectors() {
  return connectors;
}

function getConnectorById(id) {
  return connectors.find(c => c.id === id);
}

async function runConnector(connectorId) {
  const connector = getConnectorById(connectorId);
  
  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  if (!connector.enabled) {
    throw new Error(`Connector disabled: ${connectorId}`);
  }

  console.log(`Running connector: ${connector.name}`);
  connector.lastRun = new Date().toISOString();

  try {
    const result = await connector.connector.run();
    
    connector.lastStatus = 'success';
    
    return {
      connector_id: connectorId,
      name: connector.name,
      status: 'success',
      timestamp: connector.lastRun,
      ...result
    };
  } catch (error) {
    connector.lastStatus = 'failed';
    console.error(`Connector ${connector.name} failed:`, error);
    
    return {
      connector_id: connectorId,
      name: connector.name,
      status: 'failed',
      timestamp: connector.lastRun,
      error: error.message
    };
  }
}

module.exports = {
  getAllConnectors,
  getConnectorById,
  runConnector
};
