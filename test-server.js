const express = require('express');
const adminRoutes = require('./api/routes/admin.js');
const enablerRoutes = require('./api/routes/enabler.js');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Mock user middleware
app.use((req, res, next) => {
  req.user = { id: 'admin-1', role: 'admin' };
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Maysar API Server', 
    version: '1.0.0',
    endpoints: {
      dashboard: '/api/admin/dashboard',
      enablers: '/api/admin/enablers',
      enablerDashboard: '/api/enabler/dashboard',
      enablerTraining: '/api/enabler/training/courses',
      enablerPerformance: '/api/enabler/performance',
      enablerLogistics: '/api/enabler/logistics/tasks'
    }
  });
});

// Admin routes
app.use('/api/admin', adminRoutes);

// Enabler routes
app.use('/api/enabler', enablerRoutes);

const PORT = process.env.PORT || 3014;
app.listen(PORT, () => {
  console.log(`Maysar API Server running on http://localhost:${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/api/admin/dashboard`);
  console.log(`Enabler Training: http://localhost:${PORT}/api/enabler/training/courses`);
});