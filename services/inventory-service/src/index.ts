import express from 'express';
import { PrismaClient } from '@prisma/client';
import { StockManager } from './modules/stock/stockManager';
import { ReservationEngine } from './modules/reservation/reservationEngine';
import { WarehouseManager } from './modules/warehouse/warehouseManager';
import { StockApi } from './modules/api/stockApi';
import { InventoryEventHandlers } from './modules/events/eventHandlers';
import { eventBus } from './shared/events/eventBus';

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
const apiRouter = express.Router();

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

// Error handling middleware
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Inventory Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api/v1`);

  // Start background tasks
  startBackgroundTasks();
});

/**
 * Start background tasks for inventory management
 */
function startBackgroundTasks(): void {
  // Clean up expired reservations every 5 minutes
  setInterval(async () => {
    try {
      await eventHandlers.cleanupExpiredReservations();
    } catch (error) {
      console.error('Error in expired reservations cleanup:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Monitor low stock levels every 10 minutes
  setInterval(async () => {
    try {
      // This would typically scan all stock items and emit alerts
      // For now, just log that the monitor is running
      console.log('Running low stock monitoring...');
    } catch (error) {
      console.error('Error in low stock monitoring:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  console.log('🔄 Background tasks started');
}

// Export for testing
export { app, prisma, stockManager, reservationEngine, warehouseManager, eventHandlers };
