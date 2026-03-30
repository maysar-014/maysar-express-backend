import 'reflect-metadata';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createSmsRouter } from './api/routes';

declare global {
    interface GlobalThis {
        __smsEnvLogged?: boolean;
    }
}

export class SmsServiceApplication {
    private app: Express;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(compression());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'OK', service: 'sms-service', timestamp: new Date() });
        });

        // API Routes
        this.app.use('/api/v1/sms', createSmsRouter());

        // Global error handler
        this.app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            process.stderr.write(`Unhandled error: ${message}\n`);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message
                }
            });
        });
    }

    public getApp(): Express {
        return this.app;
    }

    public async start(port: number): Promise<void> {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                process.stdout.write(`SMS Service running on port ${port}\n`);
                resolve();
            });
        });
    }
}

export const createServer = (_container?: unknown): Express => {
    return new SmsServiceApplication().getApp();
};
