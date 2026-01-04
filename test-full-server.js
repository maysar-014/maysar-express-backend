const express = require('express');
const adminRoutes = require('./api/routes/admin');

const app = express();

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

app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Full test server is running',
    endpoints: [
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/sellers',
      '/api/admin/enablers',
      '/api/admin/suppliers',
      '/api/admin/finance',
      '/api/admin/kyc'
    ]
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Full test server running on http://localhost:${PORT}`);
  console.log(`Admin console API endpoints available at http://localhost:${PORT}/api/admin/*`);
});
