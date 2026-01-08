const express = require('express');
const cors = require('cors');
const courierRoutes = require('./api/routes/courier');

const app = express();
const PORT = process.env.PORT || 3015;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3400', 'http://localhost:3014', 'http://localhost:3018', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'maysar-courier-api',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Mount courier routes
app.use('/api/courier', courierRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Maysar Courier API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      courier: '/api/courier/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Courier API Server running on http://localhost:${PORT}`);
  console.log(`📦 Active Deliveries: /api/courier/deliveries/active`);
  console.log(`🗺️  Route Optimization: /api/courier/routes/optimize`);
  console.log(`💰 Earnings: /api/courier/earnings`);
  console.log(`📊 Performance: /api/courier/performance`);
  console.log(`🚗 Vehicle: /api/courier/vehicle`);
  console.log(`📋 Dashboard: /api/courier/dashboard`);
});

module.exports = app;
