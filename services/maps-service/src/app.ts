import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { healthRouter as healthRoutes } from './api/routes/health.routes';
import { errorHandler, validationErrorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { logger } from './infrastructure/services/logger.service';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

export class MapsServiceApplication {
    private server: InversifyExpressServer;
    private app: express.Application;

    constructor(container: Container) {
        this.server = new InversifyExpressServer(container);

        this.server.setConfig((app) => {
            app.use(correlationMiddleware());
            app.use(helmet());
            app.use(cors({ origin: '*', credentials: true }));
            app.use(compression());
            app.use(express.json({ limit: '10mb' }));
            app.use(express.urlencoded({ extended: true, limit: '10mb' }));
            app.use(requestLogger);
            app.use('/health', healthRoutes);

            // Prometheus metrics
            app.get('/metrics', async (req, res) => {
                res.set('Content-Type', metricsRegistry.contentType);
                res.end(await metricsRegistry.metrics());
            });
        });

        this.server.setErrorConfig((app) => {
            app.use(validationErrorHandler);
            app.use(errorHandler);
        });

        this.app = this.server.build();
    }

    getApp(): express.Application {
        return this.app;
    }

    async start(port: number): Promise<void> {
        this.app.listen(port, () => {
            logger.info(`Maps Service started on port ${port}`);
        });
        this.setupGracefulShutdown();
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            logger.info(`Received ${signal}, initiating graceful shutdown...`);
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

export function createServer(container: Container) {
    const appInstance = new MapsServiceApplication(container);
    return appInstance.getApp();
}
