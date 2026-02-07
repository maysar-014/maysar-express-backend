import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { ticketRouter } from './src/api/routes/ticket.routes';
import { agentRouter } from './src/api/routes/agent.routes';
import { SupportEventSubscriber } from './src/infrastructure/messaging/support-event-subscriber';
import { container } from './src/infrastructure/container';
import { TYPES } from './src/types';

export const SupportModule: Module = {
    name: 'support-service',
    initialize: async () => {
        console.log('Initializing support-service module');
        const subscriber = container.get<SupportEventSubscriber>(TYPES.SupportEventSubscriber);
        await subscriber.initialize();
    },
    routes: (() => {
        const router = Router();
        router.use('/tickets', ticketRouter);
        router.use('/agents', agentRouter);
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down support-service module');
        // Cleanup connections if needed
    }
};
