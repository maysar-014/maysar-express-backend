import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Module } from '../../src/core/module.interface';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { healthRoutes } from './src/api/routes/health.routes';
import { createWalletRoutes } from './src/api/routes/wallet.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { Container } from './src/container';
import { createPrismaClient } from '@shared/database/prisma-client';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

const prisma = createPrismaClient();
const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

export { eventIdempotency };

export const WalletModule: Module = {
    name: 'wallet-service',
    initialize: async () => {
        console.log('Initializing wallet-service module');
        // eventIdempotency is available for injection into PaymentCompletedHandler
        // when it is instantiated by the service's internal wiring.
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));

        try {
            // Lazy load to avoid env-dependent side effects during module import
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const container = Container.getInstance();
            router.use('/wallets', createWalletRoutes(container.walletController));
        } catch (error) {
            console.log('Failed to mount wallet routes, falling back to degraded handler', error);
            router.all('/wallets/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Wallet routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }

        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down wallet-service module');
    }
};


