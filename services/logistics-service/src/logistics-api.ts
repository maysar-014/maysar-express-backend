// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { LogisticsEngine } from './engines/logistics.engine';

const app = express();
const port = 3008; // Different port to avoid conflict

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'logistics-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Logistics calculation endpoint
app.post('/api/v1/logistics/calculate', async (req, res) => {
  try {
    console.log('ðŸ“¦ Processing logistics request...');
    const engine = new LogisticsEngine();
    const result = await engine.processLogisticsRequest(req.body);
    
    console.log(`âœ… Logistics calculated: ${result.deliveryId} - ${result.shippingCost} TZS`);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('âŒ Logistics calculation failed:', error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGISTICS_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Test endpoint
app.get('/api/v1/logistics/test', async (req, res) => {
  try {
    const engine = new LogisticsEngine();
    const testResult = await engine.processLogisticsRequest({
      orderId: 'api_test_001',
      pickupAddress: {
        street: 'Uhuru Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11101',
        country: 'Tanzania',
        contactName: 'Test Sender',
        contactPhone: '+255712345678'
      },
      deliveryAddress: {
        street: 'Samora Avenue',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '11102',
        country: 'Tanzania',
        contactName: 'Test Recipient',
        contactPhone: '+255723456789'
      },
      packageDetails: {
        weight: 2.0,
        dimensions: { length: 25, width: 20, height: 15 },
        value: 35000,
        fragile: false,
        perishable: false,
        hazardous: false,
        items: []
      },
      serviceType: 'standard' as const,
      priority: 'normal' as const
    });

    res.json({
      success: true,
      message: 'Logistics API is working!',
      testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableEndpoints: [
        'GET /health',
        'POST /api/v1/logistics/calculate',
        'GET /api/v1/logistics/test'
      ],
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`ðŸšš Logistics API Server running on port ${port}`);
  console.log(`ðŸ“ Health check: http://localhost:${port}/health`);
  console.log(`ðŸ§® Calculate endpoint: POST http://localhost:${port}/api/v1/logistics/calculate`);
  console.log(`ðŸ§ª Test endpoint: GET http://localhost:${port}/api/v1/logistics/test`);
  console.log('âœ… Ready to process logistics requests!');
});
