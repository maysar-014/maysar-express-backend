import express from 'express';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { StockManager } from './modules/stock/stockManager';
import { ReservationEngine } from './modules/reservation/reservationEngine';
import { WarehouseManager } from './modules/warehouse/warehouseManager';
import { StockApi } from './modules/api/stockApi';
import { InventoryEventHandlers } from './modules/events/eventHandlers';
import { eventBus } from './shared/events/eventBus';
import { requireAuth } from './middleware/auth';

// Initialize dependencies
const prisma = new PrismaClient();
const stockManager = new StockManager(prisma, eventBus);
const warehouseManager = new WarehouseManager(prisma);
const reservationEngine = new ReservationEngine(prisma, stockManager, warehouseManager, eventBus);

// Initialize event handlers
const eventHandlers = new InventoryEventHandlers(stockManager, reservationEngine);

// Initialize API
const stockApi = new StockApi(prisma, stockManager, reservationEngine, warehouseManager);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter (configurable via env)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes get a dedicated router with auth middleware applied
const apiRouter = express.Router();
apiRouter.use(requireAuth);

// Stock Management Routes
apiRouter.get('/stock/:variantId', stockApi.getStockLevel);
apiRouter.put('/stock/:variantId/:warehouseId', stockApi.adjustStock);

apiRouter.post('/reservations', (req, res) => stockApi.createReservation(req, res));
apiRouter.delete('/reservations/:orderId', (req, res) => stockApi.cancelReservation(req, res));
apiRouter.get('/reservations/:orderId', (req, res) => stockApi.getOrderReservations(req, res));

apiRouter.get('/warehouses', (req, res) => stockApi.getWarehouses(req, res));
apiRouter.get('/warehouses/:id', (req, res) => stockApi.getWarehouse(req, res));

apiRouter.post('/inventory-counts', (req, res) => stockApi.startInventoryCount(req, res));
apiRouter.put('/inventory-counts/:countId', (req, res) => stockApi.completeInventoryCount(req, res));

apiRouter.get('/analytics/stock-levels', (req, res) => stockApi.getStockAnalytics(req, res));

// Mount API routes
app.use('/api/v1', apiRouter);

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server only if not worker-only
if (process.env.WORKER_ONLY !== 'true') {
  app.listen(PORT, () => {
    console.log(`Inventory Service (http) running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API endpoints: http://localhost:${PORT}/api/v1`);
  });
}

// Export objects for testing
export { app, prisma, stockManager, reservationEngine, warehouseManager, eventHandlers };