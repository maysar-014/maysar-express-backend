import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Module } from '../../src/core/module.interface';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/services/logger.service';
import { createPayoutRoutes } from './src/api/routes/payout.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { Container as PaymentContainer } from './src/container';
import { Container as PayoutContainer } from '../payout-service/src/container';
import { PayoutRepository } from '../payout-service/src/infrastructure/repositories/payout.repository';
import { PiiEncryptionService } from '../../shared/encryption/pii-encryption.service';
import { PayoutPolicy } from '../payout-service/src/domain/policies/payout.policy';
import { InitiatePayoutUseCase } from '../payout-service/src/application/use-cases/initiate-payout.use-case';

const prisma = new PrismaClient();
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

export { eventIdempotency };

const payoutWiring = (() => {
    const payoutContainer = PayoutContainer.getInstance();
    const payoutRepository = new PayoutRepository(prisma, new PiiEncryptionService());
    const payoutPolicy = new PayoutPolicy();
    const initiatePayoutUseCase = new InitiatePayoutUseCase(
        payoutRepository,
        payoutPolicy,
        payoutContainer.payoutProcessingSaga
    );

    const payoutController = {
        createPayout: async (req: any, res: any) => {
            try {
                const userId = req.body.userId || req.user?.id || req.body.sellerId;
                const userRole = req.body.userRole || req.user?.role || 'seller';
                const result = await initiatePayoutUseCase.execute({
                    ...req.body,
                    userId,
                    userRole
                });
                res.status(result.success ? 201 : 400).json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        },
        getPayout: async (req: any, res: any) => {
            try {
                const payout = await payoutRepository.findById(req.params.id);
                if (!payout) {
                    res.status(404).json({ success: false, error: 'Payout not found' });
                    return;
                }
                res.status(200).json({ success: true, data: payout });
            } catch (error) {
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        },
        getSellerPayouts: async (req: any, res: any) => {
            try {
                const payouts = await payoutRepository.findByUserId(req.params.sellerId);
                res.status(200).json({ success: true, data: payouts });
            } catch (error) {
                res.status(500).json({ success: false, error: 'Internal server error' });
            }
        }
    };

    return { payoutController };
})();

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
            router.use('/payments', createPaymentRoutes(container.paymentController));
            router.use('/payouts', createPayoutRoutes(payoutWiring.payoutController as never));
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

        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down payment-service module');
    }
};
