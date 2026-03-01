import express from 'express';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../../../shared/middleware/redis-rate-limit.store';
import Redis from 'ioredis';
import { StockManager } from './modules/stock/stockManager';
import { ReservationEngine } from './modules/reservation/reservationEngine';
import { WarehouseManager } from './modules/warehouse/warehouseManager';
import { StockApi } from './modules/api/stockApi';
import { InventoryEventHandlers } from './modules/events/eventHandlers';
import { eventBus } from '@shared-events/eventBus';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { loggingMiddlewareStack } from './middleware/logging.middleware';
import { logger } from './infrastructure/services/logger.service';
import { IdempotencyMiddleware, EventIdempotency } from '@shared/middleware/idempotency';
import { SagaRecoveryWorker } from '@shared/saga/saga-recovery.worker';
import { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';
import { tracingService } from '../../../shared/tracing/openTelemetry';
import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { metricsRegistry } from './infrastructure/monitoring/metrics';

// Initialize dependencies
tracingService.start();
const prisma = new PrismaClient();
const stockManager = new StockManager(prisma, eventBus);
const warehouseManager = new WarehouseManager(prisma);
const reservationEngine = new ReservationEngine(prisma, stockManager, warehouseManager, eventBus);

// Initialize event handlers
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);
const eventHandlers = new InventoryEventHandlers(stockManager, reservationEngine, eventIdempotency);

// Saga Recovery Worker (inventory owns no sagas but participates in cross-service recovery)
const inventorySagaLogRepository = new PrismaSagaLogRepository(prisma);
const inventoryOrchestratorRegistry = new Map<string, DistributedSagaOrchestrator>();
const inventoryRecoveryWorker = new SagaRecoveryWorker(inventorySagaLogRepository, inventoryOrchestratorRegistry, {
  stuckThresholdMs: 5 * 60 * 1000,
  pollIntervalMs: 60 * 1000
});
inventoryRecoveryWorker.start();

// Initialize API
const stockApi = new StockApi(prisma, stockManager, reservationEngine, warehouseManager);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3006;

// Security middleware
app.use(correlationMiddleware());
app.use(loggingMiddlewareStack);
app.use(helmet());
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter (configurable via env)
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore(redisClient, 'rl:inventory:')
});
app.use(limiter);

// Health check routes
app.use('/health', healthRoutes);

// API routes get a dedicated router with auth middleware applied
const apiRouter = express.Router();
apiRouter.use(requireAuth);

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
apiRouter.use(idempotencyMiddleware.middleware());

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

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  inventoryRecoveryWorker.stop();
  await eventBus.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  inventoryRecoveryWorker.stop();
  await eventBus.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server only if not worker-only
if (process.env.WORKER_ONLY !== 'true') {
  app.listen(PORT, () => {
    logger.info(`Inventory Service running on port ${PORT}`);
  });
}

// Export objects for testing
export { app, prisma, stockManager, reservationEngine, warehouseManager, eventHandlers };