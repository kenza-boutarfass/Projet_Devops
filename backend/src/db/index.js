const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/data_quality_devops';

const pool = new Pool({
  connectionString,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return { ...res, duration };
}

async function checkDbConnection() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 AS ok');
    const latencyMs = Date.now() - start;
    return {
      connected: result.rows[0].ok === 1,
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

module.exports = {
  pool,
  query,
  checkDbConnection,
};
