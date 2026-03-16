import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PlaceOrderUseCase } from './src/application/use-cases/place-order.use-case';
import { OrderController } from './src/api/controllers/order.controller';
import { setupOrderRoutes } from './src/api/routes/order.routes';
import { PrismaOrderRepository } from './src/infrastructure/database/prisma-order.repository';
import { OrderFulfillmentSaga } from './src/application/sagas/order-fulfillment.saga';
import { CODEligibilityEngine } from './src/domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from './src/domain/services/cod-commitment.service';
import { CheckCODEligibilityUseCase } from './src/application/use-cases/check-cod-eligibility.use-case';
import { CODDisputeController } from './src/api/controllers/cod-dispute.controller';
import { ResolveCODDisputeUseCase } from './src/application/use-cases/resolve-cod-dispute.use-case';
import { PrismaCODDisputeRepository } from './src/infrastructure/database/prisma-cod-dispute.repository';
import { AuthServiceClient } from './src/infrastructure/integrations/auth-service.client';
import { UserServiceClient } from './src/infrastructure/integrations/user-service.client';
import { LogisticsServiceClient } from './src/infrastructure/integrations/logistics-service.client';
import { WalletServiceClient } from './src/infrastructure/integrations/wallet-service.client';
import { eventBus } from '../../shared/events/eventBus';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/monitoring/logger';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { databaseManager, loadDatabaseConfig } from './src/config/database.config';
import healthRoutes from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';

let outboxProcessor: OutboxProcessor | null = null;

function createDegradedOrderRouter(reason: string): Router {
    const degradedRouter = Router();

    degradedRouter.use('/health', healthRoutes);

    degradedRouter.get('/orders', (_req, res) => {
        res.status(503).json({
            success: false,
            error: 'Order service is in degraded mode',
            reason
        });
    });

    degradedRouter.all('*', (_req, res) => {
        res.status(503).json({
            success: false,
            error: 'Order service is in degraded mode',
            reason
        });
    });

    return degradedRouter;
}

export const OrderModule: Module = {
    name: 'order-service',
    initialize: async () => {
        logger.info('Initializing order-service module');
        // Ensure the module never mounts as an empty router.
        OrderModule.routes = createDegradedOrderRouter('Initialization in progress');

        try {
            await databaseManager.initialize(loadDatabaseConfig());
            const prisma = databaseManager.getPrisma();

            // Initialize dependencies
            // Note: OrderRepository is instantiated inside controller currently (legacy pattern)
            // Ideally we should inject it here. For now we assume controller handles its deps or we improve it.
            // But Controller constructor takes PlaceOrderUseCase.

            const orderRepository = new PrismaOrderRepository();
            const eventPublisher = {
                publish: async (e: any) => {
                    const eventType = e?.type ?? e?.constructor?.name ?? 'UnknownEvent';
                    await eventBus.publish(eventType, e);
                }
            };

            const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);
            const sagaOrchestrator = new OrderFulfillmentSaga(eventIdempotency);

            const authServiceClient = new AuthServiceClient();
            const userServiceClient = new UserServiceClient();
            const logisticsServiceClient = new LogisticsServiceClient();
            const walletServiceClient = new WalletServiceClient();

            const codEligibilityEngine = new CODEligibilityEngine(
                authServiceClient,
                userServiceClient,
                logisticsServiceClient
            );
            const codCommitmentService = new CODCommitmentService(walletServiceClient);

            const placeOrderUseCase = new PlaceOrderUseCase(
                orderRepository,
                eventPublisher,
                sagaOrchestrator,
                codEligibilityEngine,
                codCommitmentService
            );

            const checkCODEligibilityUseCase = new CheckCODEligibilityUseCase(codEligibilityEngine);
            const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase);

            const codDisputeRepository = new PrismaCODDisputeRepository();
            const resolveCODDisputeUseCase = new ResolveCODDisputeUseCase(codDisputeRepository, eventPublisher);
            const codDisputeController = new CODDisputeController(resolveCODDisputeUseCase);

            const orderRouter = setupOrderRoutes(orderController, codDisputeController);
            orderRouter.use('/health', healthRoutes);
            orderRouter.use('/system/maintenance', createMaintenanceRoutes());
            OrderModule.routes = orderRouter;
            logger.info('Order-service routes mounted successfully');

            // Initialize and start OutboxProcessor
            const outbox = new TransactionalOutbox(prisma, 'order_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'order-service');
            outboxProcessor.start();
            logger.info('Order-service outbox processor started');
        } catch (error) {
            logger.error('Failed init order-service', error);
            const reason = error instanceof Error ? error.message : 'Unknown initialization error';
            OrderModule.routes = createDegradedOrderRouter(reason);
        }
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down order-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
        await databaseManager.disconnect();
    }
};

