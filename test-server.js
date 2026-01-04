const express = require('express');

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

// Test root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Test server is running', endpoints: ['/api/admin/sellers'] });
});

// Test sellers endpoint
app.get('/api/admin/sellers', (req, res) => {
  const { tab = 'overview' } = req.query;
  
  const baseData = {
    tierDistribution: {
      starter: { count: 2340, revenue: 450000, avgRating: 4.2 },
      growth: { count: 1850, revenue: 1250000, avgRating: 4.4 },
      premium: { count: 890, revenue: 2100000, avgRating: 4.6 },
      elite: { count: 320, revenue: 3200000, avgRating: 4.8 },
      partner: { count: 45, revenue: 5800000, avgRating: 4.9 }
    }
  };

  if (tab === 'overview') {
    res.json({
      success: true,
      data: {
        ...baseData,
        sellers: [
          {
            id: 'seller-1',
            businessName: 'Tech Electronics Store',
            ownerName: 'John Smith',
            email: 'john@techstore.com',
            phone: '+255123456789',
            businessType: 'Electronics',
            tier: 'Premium',
            status: 'Active',
            kycStatus: 'Verified',
            joinedAt: '2023-12-01T00:00:00Z',
            location: 'Dar es Salaam, Tanzania',
            metrics: {
              totalOrders: 1250,
              monthlyOrders: 89,
              revenue: 125000,
              monthlyRevenue: 12500,
              rating: 4.7,
              products: 89,
              activeProducts: 76,
              fulfillmentRate: 94.2,
              responseTime: 2.3,
              disputes: 3,
              returns: 12
            }
          }
        ]
      }
    });
  } else {
    res.json({
      success: true,
      data: {
        ...baseData,
        message: `${tab} tab data`
      }
    });
  }
});

// Test suspend endpoint
app.post('/api/admin/sellers/:id/suspend', (req, res) => {
  res.json({
    success: true,
    data: {
      sellerId: req.params.id,
      status: 'suspended',
      reason: req.body.reason,
      suspendedAt: new Date().toISOString()
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/admin/sellers`);
});