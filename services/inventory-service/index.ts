import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';

let outboxProcessor: OutboxProcessor | null = null;

export const InventoryModule: Module = {
    name: 'inventory-service',
    initialize: async () => {
        console.log('Initializing inventory-service module');

        try {
            const prisma = new PrismaClient();
            const outbox = new TransactionalOutbox(prisma, 'inventory_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'inventory-service');
            outboxProcessor.start();
            console.log('Inventory-service outbox processor started');
        } catch (e) {
            console.error('Failed to start inventory-service outbox processor:', e);
        }
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down inventory-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
