const { Pool } = require('pg');

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      return value;
    }
  }
  return undefined;
}

const pool = new Pool({
  host: firstDefined(process.env.PGHOST, process.env.POSTGRES_HOST, '127.0.0.1'),
  port: Number(firstDefined(process.env.PGPORT, process.env.POSTGRES_PORT, 5432)),
  user: firstDefined(process.env.PGUSER, process.env.POSTGRES_USER, 'receiptradar'),
  password: firstDefined(process.env.PGPASSWORD, process.env.POSTGRES_PASSWORD, 'receiptradar'),
  database: firstDefined(process.env.PGDATABASE, process.env.POSTGRES_DB, 'receiptradar')
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function getClient() {
  return await pool.connect();
}

module.exports = {
  query,
  getClient
};
