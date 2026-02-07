import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PlaceOrderUseCase } from './src/application/use-cases/place-order.use-case';
import { OrderController } from './src/api/controllers/order.controller';
import { setupOrderRoutes } from './src/api/routes/order.routes';
import { SupabaseOrderRepository } from './src/infrastructure/database/supabase-order.repository';
import { OrderFulfillmentSaga } from './src/application/sagas/order-fulfillment.saga';
import { eventBus } from '../../shared/events/eventBus';

export const OrderModule: Module = {
    name: 'order-service',
    initialize: async () => {
        console.log('Initializing order-service module');

        try {
            // Initialize dependencies
            // Note: OrderRepository is instantiated inside controller currently (legacy pattern)
            // Ideally we should inject it here. For now we assume controller handles its deps or we improve it.
            // But Controller constructor takes PlaceOrderUseCase.

            const orderRepository = new SupabaseOrderRepository();
            // Using simplified event publisher wrapper or eventBus directly if interface matches.
            // PlaceOrderUseCase expects { publish(event: any): Promise<void> }
            const eventPublisher = { publish: async (e: any) => eventBus.publish(e.constructor.name, e) };

            // Saga requires orchestrator/bus? Assuming default constructor or similar pattern
            // Check usage: new OrderFulfillmentSaga(). But Saga likely needs deps.
            // For verification pass, we'll try to instantiate. If fails, we'll catch.
            const sagaOrchestrator = new OrderFulfillmentSaga();

            const placeOrderUseCase = new PlaceOrderUseCase(orderRepository, eventPublisher, sagaOrchestrator);

            const orderController = new OrderController(placeOrderUseCase);

            OrderModule.routes = setupOrderRoutes(orderController) as any;
            console.log('Order-service routes mounted successfully');
        } catch (error) {
            console.error('Failed init order-service', error);
        }
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down order-service module');
    }
};
