import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Container } from './container';
import { createWalletRoutes } from './api/routes/wallet.routes';

export function createApp() {
    const app = express();
    const container = Container.getInstance();

    app.use(helmet());
    app.use(cors());
    app.use(morgan('dev'));
    app.use(express.json());

    // Start background processors
    container.outboxProcessor.start();

    app.use('/api/wallets', createWalletRoutes(container.walletController));

    return app;
}
