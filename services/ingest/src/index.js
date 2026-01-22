require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { runConnector, getAllConnectors } = require('./scheduler');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectors: getAllConnectors().length,
    timestamp: new Date().toISOString() 
  });
});

app.get('/connectors', (req, res) => {
  const connectors = getAllConnectors();
  res.json(connectors.map(c => ({
    id: c.id,
    name: c.name,
    chain: c.chain,
    type: c.type,
    enabled: c.enabled,
    schedule: c.schedule,
    last_run: c.lastRun,
    last_status: c.lastStatus
  })));
});

app.post('/connectors/:id/run', async (req, res) => {
  try {
    const result = await runConnector(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule all connectors
function scheduleConnectors() {
  const connectors = getAllConnectors();
  
  connectors.forEach(connector => {
    if (connector.enabled && connector.schedule) {
      cron.schedule(connector.schedule, async () => {
        console.log(`Running scheduled connector: ${connector.name}`);
        try {
          await runConnector(connector.id);
        } catch (error) {
          console.error(`Scheduled run failed for ${connector.name}:`, error);
        }
      });
      
      console.log(`Scheduled ${connector.name}: ${connector.schedule}`);
    }
  });
}

app.listen(port, () => {
  console.log(`Ingest service running on port ${port}`);
  scheduleConnectors();
});
