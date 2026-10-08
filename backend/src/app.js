const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Data Quality API is running',
    status: 'healthy',
  });
});

module.exports = app;