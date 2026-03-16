import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Container } from './container';
import { createPayoutRoutes } from './api/routes/payout.routes';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';

export function createApp() {
    const app = express();
    app.use(correlationMiddleware()); // Mounted as the first middleware
    const container = Container.getInstance();

    app.use(helmet());
    app.use(cors());
    app.use(morgan('dev'));
    app.use(express.json());

    // Prometheus metrics
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    app.use('/api/payouts', createPayoutRoutes(container.payoutController));
    app.use('/api/v1/system/maintenance', createMaintenanceRoutes());

    return app;
}
