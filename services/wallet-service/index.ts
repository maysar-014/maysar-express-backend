import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Module } from '../../src/core/module.interface';
import { EventIdempotency } from '../../shared/middleware/idempotency';

const prisma = new PrismaClient();
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

export { eventIdempotency };

export const WalletModule: Module = {
    name: 'wallet-service',
    initialize: async () => {
        console.log('Initializing wallet-service module');
        // eventIdempotency is available for injection into PaymentCompletedHandler
        // when it is instantiated by the service's internal wiring.
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down wallet-service module');
    }
};
