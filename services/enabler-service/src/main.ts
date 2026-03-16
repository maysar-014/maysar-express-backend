import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { createPrismaClient } from '@shared/database/prisma-client';

// Use Cases
import { RegisterEnablerUseCase } from './application/use-cases/register-enabler.use-case';
import { ApproveEnablerUseCase } from './application/use-cases/approve-enabler.use-case';
import { ListProductUseCase } from './application/use-cases/list-product.use-case';
import { FacilitateOrderUseCase } from './application/use-cases/facilitate-order.use-case';
import { CalculateEnablerCommissionUseCase } from './application/use-cases/calculate-enabler-commission.use-case';

// Infrastructure
import { PrismaEnablerRepository } from './infrastructure/repositories/prisma-enabler.repository';
import { PrismaProductListingRepository } from './infrastructure/repositories/prisma-product-listing.repository';
import { PrismaEnablerOrderRepository } from './infrastructure/repositories/prisma-enabler-order.repository';
import { PrismaEnablerAnalyticsRepository } from './infrastructure/repositories/prisma-enabler-analytics.repository';
import { PrismaEnablerPolicyRepository } from './infrastructure/repositories/prisma-enabler-policy.repository';
import { EnablerEventPublisher } from './infrastructure/messaging/enabler-event-publisher';
import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

// Initialize Tracing
tracingService.start();

// API
import { EnablerController } from './api/controllers/enabler.controller';
import { ProductListingController } from './api/controllers/product-listing.controller';
import { EnablerOrderController } from './api/controllers/enabler-order.controller';
import { authorizeEnabler } from './api/middleware/enabler-authorization.middleware';
import enablerRoutes from './api/routes/enabler.routes';
import hubRoutes from './api/routes/hub.routes';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';

/**
 * Enabler Service Main Application
 * Production-ready microservice with Clean Architecture
 */
class EnablerService {
    private app: express.Application;
    private prisma: PrismaClient;
    private eventPublisher!: EnablerEventPublisher;
    private logger: winston.Logger;

    constructor() {
        this.app = express();
        this.prisma = createPrismaClient();
        this.logger = this.setupLogger();

        this.initializeInfrastructure();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private async initializeInfrastructure(): Promise<void> {
        try {
            await this.prisma.$connect();
            this.logger.info('Database connected successfully');

            this.eventPublisher = new EnablerEventPublisher();
            // await this.eventPublisher.connect(); // If connecting to broker needed
            this.logger.info('Event publisher initialized');
        } catch (error) {
            this.logger.error('Failed to initialize infrastructure:', error);
            process.exit(1);
        }
    }

    private setupLogger(): winston.Logger {
        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'enabler-service' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    private setupMiddleware(): void {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(compression());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(correlationMiddleware());

        // Prometheus metrics
        this.app.get('/metrics', async (req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Health Check
        this.app.get('/health', async (req, res) => {
            try {
                await this.prisma.$queryRaw`SELECT 1`;
                res.json({ status: 'healthy', service: 'enabler-service' });
            } catch (error) {
                res.status(503).json({ status: 'unhealthy', error: 'Database disconnected' });
            }
        });

        // API Routes - Manual DI for now (In real app use DI Container)
        // Repositories
        const enablerRepo = new PrismaEnablerRepository();
        const listingRepo = new PrismaProductListingRepository();
        const orderRepo = new PrismaEnablerOrderRepository();
        const analyticsRepo = new PrismaEnablerAnalyticsRepository();
        const policyRepo = new PrismaEnablerPolicyRepository();

        // Service clients (must be configured with real integrations)
        const catalogService = {
            getProduct: async () => {
                throw new Error('Catalog service client is not configured.');
            }
        };
        const inventoryService = {
            checkAvailability: async () => {
                throw new Error('Inventory service client is not configured.');
            },
            reserve: async () => {
                throw new Error('Inventory service client is not configured.');
            },
            confirmReservation: async () => {
                throw new Error('Inventory service client is not configured.');
            },
            releaseReservation: async () => {
                throw new Error('Inventory service client is not configured.');
            }
        };
        const orderService = {
            createOrder: async () => {
                throw new Error('Order service client is not configured.');
            }
        };

        // Use Cases
        const registerUseCase = new RegisterEnablerUseCase(
            enablerRepo,
            this.eventPublisher,
            analyticsRepo,
            policyRepo
        );
        const approveUseCase = new ApproveEnablerUseCase(enablerRepo, this.eventPublisher);
        const listProductUseCase = new ListProductUseCase(enablerRepo, listingRepo, catalogService, this.eventPublisher);
        const facilitateOrderUseCase = new FacilitateOrderUseCase(enablerRepo, orderRepo, listingRepo, inventoryService, orderService, this.eventPublisher);
        const calculateCommissionUseCase = new CalculateEnablerCommissionUseCase(enablerRepo, orderRepo);

        // Controllers
        const enablerController = new EnablerController(registerUseCase, approveUseCase, enablerRepo);
        const listingController = new ProductListingController(listProductUseCase, listingRepo);
        const orderController = new EnablerOrderController(facilitateOrderUseCase, calculateCommissionUseCase, orderRepo);

        // Dynamic Router Setup
        const apiRouter = express.Router();

        // Enabler Routes
        apiRouter.post('/enablers/register', (req, res) => enablerController.register(req, res));
        apiRouter.post('/enablers/:id/approve', (req, res) => enablerController.approve(req, res));
        apiRouter.get('/enablers/:id', (req, res) => enablerController.getProfile(req, res));

        // Listing Routes (Protected)
        apiRouter.post('/enablers/:enablerId/listings', authorizeEnabler, (req, res) => listingController.listProduct(req, res));
        apiRouter.get('/enablers/:enablerId/listings', authorizeEnabler, (req, res) => listingController.getListings(req, res));

        // Order Routes (Protected)
        apiRouter.post('/enablers/:enablerId/orders', authorizeEnabler, (req, res) => orderController.createOrder(req, res));
        apiRouter.get('/enablers/:enablerId/orders', authorizeEnabler, (req, res) => orderController.getOrders(req, res));

        // Hub Routes
        apiRouter.get('/hub/products', (req, res) => listingController.getHubProducts(req, res));

        // Maintenance routes (service-key protected)
        this.app.use('/api/v1/system/maintenance', createMaintenanceRoutes());

        this.app.use('/api/v1', apiRouter);
    }

    private setupErrorHandling(): void {
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            this.logger.error(err.stack);
            res.status(500).json({ error: 'Internal Server Error' });
        });
    }

    async start(): Promise<void> {
        const port = process.env.PORT || 3006;
        this.app.listen(port, () => {
            this.logger.info(`Enabler Service listening on port ${port}`);
        });
    }

    async shutdown(): Promise<void> {
        this.logger.info('Shutting down...');
        await this.prisma.$disconnect();
        process.exit(0);
    }
}

const service = new EnablerService();

process.on('SIGTERM', () => service.shutdown());
process.on('SIGINT', () => service.shutdown());

service.start().catch((err) => {
    console.error('Failed to start service:', err);
    process.exit(1);
});
