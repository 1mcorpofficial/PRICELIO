const axios = require('axios');

const INGEST_SERVICE_URL = process.env.INGEST_SERVICE_URL || 'http://127.0.0.1:3002';

async function fetchIngestConnectors() {
  const response = await axios.get(`${INGEST_SERVICE_URL}/connectors`, { timeout: 6000 });
  return Array.isArray(response.data) ? response.data : [];
}

async function forceRunIngestConnector(connectorId) {
  const response = await axios.post(
    `${INGEST_SERVICE_URL}/connectors/${encodeURIComponent(connectorId)}/run`,
    {}, { timeout: 120000 }
  );
  return response.data;
}

async function fetchIngestHealth() {
  const response = await axios.get(`${INGEST_SERVICE_URL}/health`, { timeout: 5000 });
  return response.data || {};
}

module.exports = { fetchIngestConnectors, forceRunIngestConnector, fetchIngestHealth };
