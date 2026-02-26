import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler, validationErrorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { logger } from './infrastructure/services/logger.service';

export class SessionServiceApplication {
    private server: InversifyExpressServer;
    private app: express.Application;

    constructor(container: Container) {
        this.server = new InversifyExpressServer(container);

        this.server.setConfig((app) => {
            // Security middleware
            app.use(helmet());

            // CORS
            app.use(cors({
                origin: '*', // Adjust as needed
                credentials: true
            }));

            // Compression
            app.use(compression());

            // Body parsing
            app.use(express.json({ limit: '10mb' }));
            app.use(express.urlencoded({ extended: true, limit: '10mb' }));

            // Request logging
            app.use(requestLogger);

            // Health routes
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
            logger.info(`Session Service started on port ${port}`);
        });

        this.setupGracefulShutdown();
    }

    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            logger.info(`Received ${signal}, initiating graceful shutdown...`);
            // Add cleanup logic here (e.g., closing DB/Redis)
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

export function createServer(container: Container) {
    const appInstance = new SessionServiceApplication(container);
    return appInstance.getApp();
}

