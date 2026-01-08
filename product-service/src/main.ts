import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { InventoryController } from './api/controllers/inventory.controller';
import { PricingController } from './api/controllers/pricing.controller';
import { RecommendationController } from './api/controllers/recommendation.controller';

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Controllers
const inventoryController = new InventoryController();
const pricingController = new PricingController();
const recommendationController = new RecommendationController();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'product-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Inventory routes
app.get('/api/v1/inventory/stock/:productId/:quantity/:warehouseId', inventoryController.checkStock.bind(inventoryController));
app.post('/api/v1/inventory/reserve', inventoryController.reserveStock.bind(inventoryController));
app.post('/api/v1/inventory/availability', inventoryController.getAvailability.bind(inventoryController));

// Pricing routes
app.post('/api/v1/pricing/calculate', pricingController.calculatePrice.bind(pricingController));
app.post('/api/v1/pricing/validate', pricingController.validatePrice.bind(pricingController));
app.post('/api/v1/pricing/quote', pricingController.generateQuote.bind(pricingController));

// Recommendation routes
app.post('/api/v1/recommendations/generate', recommendationController.generateRecommendations.bind(recommendationController));
app.get('/api/v1/recommendations/customer/:customerId', recommendationController.getCustomerRecommendations.bind(recommendationController));
app.post('/api/v1/recommendations/feedback', recommendationController.submitFeedback.bind(recommendationController));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Product Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Inventory API: http://localhost:${PORT}/api/v1/inventory/*`);
  console.log(`💰 Pricing API: http://localhost:${PORT}/api/v1/pricing/*`);
  console.log(`🎯 Recommendations API: http://localhost:${PORT}/api/v1/recommendations/*`);
});

export default app;