import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { tracingService, correlationMiddleware } from '../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { createApp } from './src/complianceService';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';
import { createPrismaClient } from '@shared/database/prisma-client';

// Initialize Tracing
tracingService.start();

const prisma = createPrismaClient();

export const ComplianceModule: Module = {
    name: 'compliance-service',
    initialize: async () => {
        console.log('Initializing compliance-service module');
    },
    routes: (() => {
        const router = Router();
        router.use(correlationMiddleware());
        router.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
        const complianceApp = createApp(prisma, eventBus);
        router.use(complianceApp);
        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down compliance-service module');
        await prisma.$disconnect();
    }
};
