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
import { appLogger } from '../../shared/logger/logger';

let prisma: PrismaClient;
let _eventIdempotency: EventIdempotency;

export const WalletModule: Module = {
    name: 'wallet-service',
    initialize: async () => {
        appLogger.info('Initializing wallet-service module');

        prisma = createPrismaClient();
        _eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);

        // Add all routes to the pre-declared router that app.ts already mounted.
        const walletRouter = WalletModule.routes!;
        walletRouter.use('/health', healthRoutes);
        walletRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(prisma));

        try {
            const container = Container.getInstance();
            walletRouter.use('/wallets', createWalletRoutes(container.walletController));
            // Start hold expiry + hold reconciliation. These were wired but never
            // started, so stranded COD holds were never recovered (DEF-036).
            container.startBackgroundJobs();
        } catch (error) {
            appLogger.warn('Failed to mount wallet routes, falling back to degraded handler', { error: error instanceof Error ? error.message : String(error) });
            walletRouter.all('/wallets/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Wallet routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }
    },
    routes: Router(),
    shutdown: async () => {
        appLogger.info('Shutting down wallet-service module');
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
