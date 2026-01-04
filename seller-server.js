const express = require('express');
const cors = require('cors');
const sellerRoutes = require('./api/routes/seller');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3200', 'http://localhost:3002', 'http://localhost:3016'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'maysar-seller-api',
    port: PORT,
    timestamp: new Date().toISOString() 
  });
});

// Mount seller routes
app.use('/api/seller', sellerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Maysar Seller API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      seller: '/api/seller/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Seller API Server running on http://localhost:${PORT}`);
  console.log(`📊 Seller Dashboard: /api/seller/dashboard`);
  console.log(`📦 Products: /api/seller/products`);
  console.log(`📋 Orders: /api/seller/orders`);
  console.log(`👥 Customers: /api/seller/customers`);
});

module.exports = app;