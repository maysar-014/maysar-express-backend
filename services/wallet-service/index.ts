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

let prisma: PrismaClient;
let _eventIdempotency: EventIdempotency;

export const WalletModule: Module = {
    name: 'wallet-service',
    initialize: async () => {
        console.log('Initializing wallet-service module');

        prisma = createPrismaClient();
        _eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));

        try {
            const container = Container.getInstance();
            router.use('/wallets', createWalletRoutes(container.walletController));
            // Start hold expiry + hold reconciliation. These were wired but never
            // started, so stranded COD holds were never recovered (DEF-036).
            container.startBackgroundJobs();
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

        WalletModule.routes = router;
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down wallet-service module');
        // Stop background jobs so timers do not outlive the module.
        try {
            Container.getInstance().stopBackgroundJobs();
        } catch {
            // Container may never have initialised; nothing to stop.
        }
    }
};

// Exported for injection into PaymentCompletedHandler when instantiated by internal wiring
export { _eventIdempotency as eventIdempotency };
