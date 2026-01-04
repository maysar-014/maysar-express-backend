const express = require('express');
const cors = require('cors');
const adminRoutes = require('./api/routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'maysar-api',
    port: PORT,
    timestamp: new Date().toISOString() 
  });
});

// Mount admin routes
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Maysar Admin API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      admin: '/api/admin/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin API Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard: /api/admin/dashboard`);
  console.log(`💰 Finance Data: /api/admin/finance`);
  console.log(`👥 Users: /api/admin/platform-users`);
  console.log(`🏪 Sellers: /api/admin/sellers`);
});

module.exports = app;