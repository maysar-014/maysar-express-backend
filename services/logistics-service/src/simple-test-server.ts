import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT || 3007;

// Simple test endpoint
app.get('/api/stats/performance', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'logistics-service',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'logistics-service',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Simple Logistics Service running on port ${port}`);
  console.log(`Test: http://localhost:${port}/api/stats/performance`);
  console.log(`Health: http://localhost:${port}/health`);
});