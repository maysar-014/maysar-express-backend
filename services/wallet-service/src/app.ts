import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Container } from './container';
import { createWalletRoutes } from './api/routes/wallet.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';

export function createApp() {
    const app = express();
    const container = Container.getInstance();

    app.use(helmet());
    app.use(cors());
    app.use(requestLogger);
    app.use(express.json());

    // Start background processors
    container.outboxProcessor.start();

    // Health checks
    app.use('/health', healthRoutes);

    // API routes
    app.use('/api/wallets', createWalletRoutes(container.walletController));

    // Error handling
    app.use(errorHandler);

    return app;
}
