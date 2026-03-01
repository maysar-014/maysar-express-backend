import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PrismaClient } from '@prisma/client';
import { PlaceOrderUseCase } from './src/application/use-cases/place-order.use-case';
import { OrderController } from './src/api/controllers/order.controller';
import { setupOrderRoutes } from './src/api/routes/order.routes';
import { SupabaseOrderRepository } from './src/infrastructure/database/supabase-order.repository';
import { OrderFulfillmentSaga } from './src/application/sagas/order-fulfillment.saga';
import { eventBus } from '../../shared/events/eventBus';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/monitoring/logger';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';

let outboxProcessor: OutboxProcessor | null = null;

export const OrderModule: Module = {
    name: 'order-service',
    initialize: async () => {
        logger.info('Initializing order-service module');

        try {
            // Initialize dependencies
            // Note: OrderRepository is instantiated inside controller currently (legacy pattern)
            // Ideally we should inject it here. For now we assume controller handles its deps or we improve it.
            // But Controller constructor takes PlaceOrderUseCase.

            const orderRepository = new SupabaseOrderRepository();
            const eventPublisher = { publish: async (e: any) => eventBus.publish(e.constructor.name, e) };

            const prisma = new PrismaClient();
            const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);
            const sagaOrchestrator = new OrderFulfillmentSaga(eventIdempotency);

            // Missing dependencies for PlaceOrderUseCase
            const codEligibilityEngine = {} as any;
            const codCommitmentService = {} as any;

            const placeOrderUseCase = new PlaceOrderUseCase(
                orderRepository,
                eventPublisher,
                sagaOrchestrator,
                codEligibilityEngine,
                codCommitmentService
            );

            // Missing dependency for OrderController
            const checkCODEligibilityUseCase = {} as any;
            const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase);

            // Missing dependency for setupOrderRoutes
            const codDisputeController = {} as any;
            OrderModule.routes = setupOrderRoutes(orderController, codDisputeController) as any;
            logger.info('Order-service routes mounted successfully');

            // Initialize and start OutboxProcessor
            const outbox = new TransactionalOutbox(prisma, 'order_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'order-service');
            outboxProcessor.start();
            logger.info('Order-service outbox processor started');
        } catch (error) {
            logger.error('Failed init order-service', error);
        }
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down order-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
    }
};
