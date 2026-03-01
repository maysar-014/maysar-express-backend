import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Module } from '../../src/core/module.interface';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/services/logger.service';

const prisma = new PrismaClient();
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

export { eventIdempotency };

export const PaymentModule: Module = {
    name: 'payment-service',
    initialize: async () => {
        logger.info('Initializing payment-service module');
        // eventIdempotency is available for injection into PaymentProcessingSaga
        // when it is instantiated by the service's internal wiring.
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down payment-service module');
    }
};
