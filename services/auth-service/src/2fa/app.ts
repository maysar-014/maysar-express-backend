import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { createTrustedCorsOptions } from '@shared/utils/cors';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler, validationErrorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { logger } from './infrastructure/services/logger.service';

export class TwoFactorServiceApplication {
    private server: InversifyExpressServer;
    private app: express.Application;

    constructor(container: Container) {
        this.server = new InversifyExpressServer(container);

        this.server.setConfig((app) => {
            app.use(helmet());
            app.use(cors(createTrustedCorsOptions()));
            app.use(compression());
            app.use(express.json({ limit: '10mb' }));
            app.use(express.urlencoded({ extended: true, limit: '10mb' }));
            app.use(requestLogger);
            app.use('/health', healthRoutes);
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
            logger.info(`Two-Factor Service started on port ${port}`);
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
    const appInstance = new TwoFactorServiceApplication(container);
    return appInstance.getApp();
}
