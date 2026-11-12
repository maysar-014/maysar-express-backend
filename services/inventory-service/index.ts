import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { createInventoryRoutes } from './src/api/routes/inventory.routes';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { appLogger } from '../../shared/logger/logger';
import { StockManager } from './src/modules/stock/stockManager';
import { ReservationEngine } from './src/modules/reservation/reservationEngine';
import { WarehouseManager } from './src/modules/warehouse/warehouseManager';
import { StockApi } from './src/modules/api/stockApi';
import { StockOutApi } from './src/modules/api/stockOutApi';
import { StockOutReconciliation } from './src/modules/stock-out/stockOutReconciliation';
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
        appLogger.info('Initializing inventory-service module');

        // Reuse the global Prisma singleton to share the connection pool
        const globalForPrisma = globalThis as unknown as { prisma: any };
        prisma = globalForPrisma.prisma ?? createPrismaClient();
        if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;
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
        const stockOutApi = new StockOutApi(new StockOutReconciliation(prisma));
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
            appLogger.info('Inventory-service outbox processor started');
        } catch (e) {
            appLogger.error('Failed to start inventory-service outbox processor', { error: e instanceof Error ? e.message : String(e) });
        }

        // Add all routes to the pre-declared router that app.ts already mounted.
        const invRouter = InventoryModule.routes!;
        invRouter.use('/health', healthRoutes);
        invRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));
        invRouter.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        const apiRouter = Router();
        apiRouter.use(requireAuth);

        if (process.env.REDIS_URL) {
            const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL);
            apiRouter.use(idempotencyMiddleware.middleware());
        }

        // Mount all business routes from the dedicated route file
        apiRouter.use('/', createInventoryRoutes(stockApi, stockOutApi));

        invRouter.use('/', apiRouter);
    },
    routes: Router(),
    shutdown: async () => {
        appLogger.info('Shutting down inventory-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
