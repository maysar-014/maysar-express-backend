import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/services/logger.service';
import { healthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { createWebhookRoutes } from './src/api/routes/webhook.routes';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { Container as PaymentContainer } from './src/container';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';

const prisma = createPrismaClient();
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

export { eventIdempotency };

export const PaymentModule: Module = {
    name: 'payment-service',
    initialize: async () => {
        logger.info('Initializing payment-service module');
        const container = PaymentContainer.getInstance();
        container.sagaEventHandler.setupSubscriptions().catch((err: Error) => {
            logger.error('Failed to setup saga subscriptions:', err);
        });
        container.paymentEventHandlers.registerHandlers();
        // eventIdempotency is available for injection into PaymentProcessingSaga
        // when it is instantiated by the service's internal wiring.
    },
    routes: (() => {
        const router = Router();

        router.use('/health', healthRoutes);

        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        const container = PaymentContainer.getInstance();

        try {
            // Lazy load to avoid env-dependent side effects during module import
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const createPaymentRoutes = require('./src/api/routes/payment.routes').createPaymentRoutes;
            router.use('/payments/webhooks', createWebhookRoutes(container.webhookController));
            router.use('/payments', requireAuth, createPaymentRoutes(container.paymentController));
            router.use('/webhooks', createWebhookRoutes(container.webhookController));
        } catch (error) {
            logger.warn('Failed to mount payment routes, falling back to degraded handler:', error);
            router.all('/payments/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Payment routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }

        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down payment-service module');
    }
};



