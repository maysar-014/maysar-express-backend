import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { eventBus } from '../../shared/events/eventBus';

let outboxProcessor: OutboxProcessor | null = null;

export const CommunityModule: Module = {
    name: 'community-service',
    initialize: async () => {
        console.log('Initializing community-service module');

        try {
            const prisma = new PrismaClient();
            const outbox = new TransactionalOutbox(prisma, 'outboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'community-service');
            outboxProcessor.start();
            console.log('Community-service outbox processor started');
        } catch (e) {
            console.error('Failed to start community-service outbox processor:', e);
        }
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down community-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
