import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { tracingService, correlationMiddleware } from '../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { createApp } from './src/complianceService';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../shared/events/eventBus';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

let prisma: PrismaClient;

export const ComplianceModule: Module = {
    name: 'compliance-service',
    initialize: async () => {
        console.log('Initializing compliance-service module');
        tracingService.start();
        prisma = createPrismaClient();

        const router = Router();
        router.use(correlationMiddleware());
        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });
        const complianceApp = createApp(prisma, eventBus);
        router.use(requireAuth);
        router.use(complianceApp);

        ComplianceModule.routes = router;
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down compliance-service module');
        await prisma?.$disconnect();
    }
};
