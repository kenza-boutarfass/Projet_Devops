const cors = require('cors');
const express = require('express');
const { checkDbConnection, query } = require('./db');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDbConnection();

  const isHealthy = dbHealth.connected;
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    message: isHealthy
      ? 'Data Quality API and PostgreSQL are running'
      : 'API is running but database is unreachable',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    availableRoles: ['STUDENT', 'PROFESSOR', 'PROFESSIONAL'],
  });
});

app.get('/api/users/roles-summary', async (req, res) => {
  try {
    const result = await query(
      'SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role ASC'
    );
    res.json({
      success: true,
      roles: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = app;