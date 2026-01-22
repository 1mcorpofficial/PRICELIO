const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'receiptradar',
  user: process.env.POSTGRES_USER || 'receiptradar',
  password: process.env.POSTGRES_PASSWORD || 'receiptradar',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function getClient() {
  return pool;
}

module.exports = { getClient, pool };
