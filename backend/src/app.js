const cors = require('cors');
const express = require('express');
const { checkDbConnection, query } = require('./db');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const datasetRoutes = require('./routes/datasets');
const { authenticate, requireRoles } = require('./middleware/auth');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes d'authentification, projets et datasets
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', datasetRoutes);

// Health check
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

// Routes de test RBAC (Role-Based Access Control)
app.get('/api/rbac/student-space', authenticate, requireRoles('STUDENT'), (req, res) => {
  res.json({ success: true, message: `Access granted to STUDENT area for ${req.user.full_name}` });
});

app.get('/api/rbac/professor-space', authenticate, requireRoles('PROFESSOR'), (req, res) => {
  res.json({ success: true, message: `Access granted to PROFESSOR supervision area for ${req.user.full_name}` });
});

app.get('/api/rbac/professional-space', authenticate, requireRoles('PROFESSIONAL'), (req, res) => {
  res.json({ success: true, message: `Access granted to PROFESSIONAL workspace for ${req.user.full_name}` });
});

module.exports = app;