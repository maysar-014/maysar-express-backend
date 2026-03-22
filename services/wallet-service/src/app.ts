import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Container } from './container';
import { createWalletRoutes } from './api/routes/wallet.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { metricsRegistry } from './infrastructure/monitoring/metrics';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

export function createApp() {
    const app = express();
    const container = Container.getInstance();

    app.use(correlationMiddleware());
    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Health checks
    app.use('/health', healthRoutes);

    // API routes
    app.use('/api/wallets', createWalletRoutes(container.walletController));
    app.use('/api/v1/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(container.prisma));

    // Prometheus metrics
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    // Error handling
    app.use(errorHandler);

    return app;
}


