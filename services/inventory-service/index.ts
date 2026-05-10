import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { StockManager } from './src/modules/stock/stockManager';
import { ReservationEngine } from './src/modules/reservation/reservationEngine';
import { WarehouseManager } from './src/modules/warehouse/warehouseManager';
import { StockApi } from './src/modules/api/stockApi';
import { InventoryEventHandlers } from './src/modules/events/eventHandlers';
import { EventIdempotency, IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { createRedisStockEngine, resolveRedisReservationMode } from './src/infrastructure/redis/redis-stock-engine';
import { InventoryOutboxRepository } from './src/infrastructure/messaging/inventory-outbox.repository';
import { metricsRegistry } from './src/infrastructure/monitoring/metrics';

let outboxProcessor: OutboxProcessor | null = null;
let prisma: PrismaClient;

export const InventoryModule: Module = {
    name: 'inventory-service',
    initialize: async () => {
        console.log('Initializing inventory-service module');

        prisma = createPrismaClient();
        const inventoryOutboxRepository = new InventoryOutboxRepository(prisma);
        const stockManager = new StockManager(prisma as any, eventBus, inventoryOutboxRepository);
        const warehouseManager = new WarehouseManager(prisma as any);
        const redisReservationMode = resolveRedisReservationMode();
        const redisStockEngineBundle = redisReservationMode === 'off' ? null : createRedisStockEngine();
        const reservationEngine = new ReservationEngine(
            prisma as any,
            stockManager,
            warehouseManager,
            eventBus,
            redisStockEngineBundle?.stockEngine,
            redisStockEngineBundle?.redisClient,
            redisReservationMode
        );
        const stockApi = new StockApi(prisma as any, stockManager, reservationEngine, warehouseManager);
        const eventIdempotency = process.env.REDIS_URL
            ? new EventIdempotency(process.env.REDIS_URL, prisma)
            : null;
        const inventoryEventHandlers = eventIdempotency
            ? new InventoryEventHandlers(stockManager, reservationEngine, eventIdempotency)
            : null;
        void inventoryEventHandlers;

        // Register ProductCreated handler to auto-initialize stock items for new products
        const { InventoryService } = await import('./src/inventoryService');
        new InventoryService(prisma);

        try {
            const outbox = new TransactionalOutbox(prisma, 'inventory_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'inventory-service');
            outboxProcessor.start();
            console.log('Inventory-service outbox processor started');
        } catch (e) {
            console.error('Failed to start inventory-service outbox processor:', e);
        }

        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));
        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        const apiRouter = Router();
        apiRouter.use(requireAuth);

        if (process.env.REDIS_URL) {
            const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL);
            apiRouter.use(idempotencyMiddleware.middleware());
        }

        apiRouter.get('/stock/:variantId', (req, res) => stockApi.getStockLevel(req, res));
        apiRouter.put('/stock/:variantId/:warehouseId', (req, res) => stockApi.adjustStock(req, res));

        apiRouter.get('/materials', (req, res) => stockApi.listMaterials(req, res));
        apiRouter.get('/materials/:variantId', (req, res) => stockApi.getMaterialStock(req, res));
        apiRouter.put('/materials/:variantId/warehouses/:warehouseId', (req, res) => stockApi.updateMaterialInventory(req, res));

        apiRouter.post('/reservations', (req, res) => stockApi.createReservation(req, res));
        apiRouter.delete('/reservations/:orderId', (req, res) => stockApi.cancelReservation(req, res));
        apiRouter.get('/reservations/:orderId', (req, res) => stockApi.getOrderReservations(req, res));

        apiRouter.get('/warehouses', (req, res) => stockApi.getWarehouses(req, res));
        apiRouter.get('/warehouses/:id', (req, res) => stockApi.getWarehouse(req, res));

        apiRouter.post('/inventory-counts', (req, res) => stockApi.startInventoryCount(req, res));
        apiRouter.put('/inventory-counts/:countId', (req, res) => stockApi.completeInventoryCount(req, res));

        apiRouter.get('/analytics/stock-levels', (req, res) => stockApi.getStockAnalytics(req, res));

        router.use('/', apiRouter);

        InventoryModule.routes = router;
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down inventory-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
