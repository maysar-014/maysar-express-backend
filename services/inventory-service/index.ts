import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

let outboxProcessor: OutboxProcessor | null = null;
const prisma = createPrismaClient();

export const InventoryModule: Module = {
    name: 'inventory-service',
    initialize: async () => {
        console.log('Initializing inventory-service module');

        try {
            const outbox = new TransactionalOutbox(prisma, 'inventory_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'inventory-service');
            outboxProcessor.start();
            console.log('Inventory-service outbox processor started');
        } catch (e) {
            console.error('Failed to start inventory-service outbox processor:', e);
        }
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down inventory-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};


