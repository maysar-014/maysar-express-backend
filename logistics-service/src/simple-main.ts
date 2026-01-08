import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3015;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'logistics-service',
    timestamp: new Date().toISOString()
  });
});

// Delivery Management
app.get('/api/courier/deliveries/available', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0,
    pagination: { page: 1, limit: 20, total: 0 }
  });
});

app.get('/api/courier/deliveries/active', (req, res) => {
  res.json({
    success: true,
    data: [{
      id: "DEL-001",
      type: "Pickup",
      location: "Kariakoo Market, Dar es Salaam",
      customer: "Amina Hassan",
      eta: "14:30",
      packageType: "Electronics",
      weight: "2.5kg",
      status: "assigned",
      priority: "high"
    }]
  });
});

app.post('/api/courier/deliveries/:id/accept', (req, res) => {
  res.json({
    success: true,
    data: {
      deliveryId: req.params.id,
      status: "accepted",
      acceptedAt: new Date().toISOString()
    }
  });
});

app.put('/api/courier/deliveries/:id/status', (req, res) => {
  res.json({
    success: true,
    data: {
      deliveryId: req.params.id,
      status: req.body.status,
      updatedAt: new Date().toISOString()
    }
  });
});

// Route & Navigation
app.get('/api/courier/routes/current', (req, res) => {
  res.json({
    success: true,
    data: {
      id: "ROUTE-001",
      name: "Kariakoo → Mikocheni → Masaki",
      totalDistance: "24.5 km",
      distanceRemaining: "16.3 km",
      timeRemaining: "28 mins",
      progress: 33,
      waypoints: []
    }
  });
});

app.post('/api/courier/routes/optimize', (req, res) => {
  res.json({
    success: true,
    data: {
      routeId: "ROUTE-002",
      optimizationSavings: {
        timeSaved: "12 mins",
        distanceSaved: "3.2 km",
        fuelSaved: "0.8L"
      },
      waypoints: [],
      estimatedDuration: "33 mins"
    }
  });
});

// Real-time Tracking
app.put('/api/courier/location', (req, res) => {
  res.json({
    success: true,
    data: {
      lat: req.body.lat,
      lng: req.body.lng,
      updated: true,
      routeRecalculated: false
    }
  });
});

app.get('/api/courier/gps/status', (req, res) => {
  res.json({
    success: true,
    data: {
      active: true,
      accuracy: "±5m",
      lastUpdate: new Date().toISOString(),
      satelliteCount: 12,
      signalStrength: "Strong",
      reliability: "98%"
    }
  });
});

// Performance Monitoring
app.get('/api/courier/performance/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      onTimeDelivery: { level: "Good", trend: "stable", percentage: 94 },
      acceptanceConsistency: { level: "Good", trend: "improving", percentage: 87 },
      issueReportingQuality: { level: "Needs Work", trend: "improving", percentage: 72 },
      safetyCompliance: { level: "Good", trend: "stable", percentage: 96 }
    }
  });
});

app.get('/api/courier/performance/kpis', (req, res) => {
  res.json({
    success: true,
    data: {
      onTimeDeliveryRate: "94%",
      customerSatisfactionScore: "4.2/5.0",
      routeEfficiencyScore: "87%",
      earningsPerHour: "5250 TZS",
      safetyScore: "96%"
    }
  });
});

// Earnings Management
app.get('/api/courier/earnings/today', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 42300,
      breakdown: {
        base: 28000,
        distance: 8500,
        time: 3800,
        weightBonus: 1200,
        heavyItemBonus: 800
      },
      deliveryCount: 12,
      hoursWorked: 8.5
    }
  });
});

app.get('/api/courier/earnings/detailed', (req, res) => {
  res.json({
    success: true,
    data: {
      period: "today",
      totalEarnings: 42300,
      breakdown: {
        baseEarnings: 28000,
        distanceBonus: 8500,
        timeBonus: 3800,
        performanceBonus: 1200,
        penalties: 0
      },
      payoutEligible: true,
      nextPayoutDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]
    }
  });
});

// Vehicle Management
app.get('/api/courier/vehicle/overview', (req, res) => {
  res.json({
    success: true,
    data: {
      registeredVehicle: "Motorcycle - Honda CB300R",
      maxAllowedWeight: "50kg",
      verificationStatus: "Verified",
      registrationNumber: "TZS 123 AB",
      insuranceExpiry: "2026-08-15"
    }
  });
});

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Logistics Service running on port ${PORT}`);
  console.log(`📋 API Base URL: http://localhost:${PORT}/api/courier`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
});