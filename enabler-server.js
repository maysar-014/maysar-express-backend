const express = require('express');
const cors = require('cors');
const enablerRoutes = require('./api/routes/enabler');

const app = express();
const PORT = process.env.PORT || 3014;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3400', 'http://localhost:3014', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'maysar-enabler-api',
    port: PORT,
    timestamp: new Date().toISOString() 
  });
});

// Mount enabler routes
app.use('/api/enabler', enablerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Maysar Enabler API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      enabler: '/api/enabler/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Enabler API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: /api/enabler/dashboard`);
  console.log(`💰 Earnings: /api/enabler/earnings`);
  console.log(`📋 Tasks: /api/enabler/tasks`);
  console.log(`👤 Profile: /api/enabler/profile`);
});

module.exports = app;