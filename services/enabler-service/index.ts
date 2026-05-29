import { Module } from '../../src/core/module.interface';
import { appLogger } from '../../shared/logger/logger';
import { eventBus } from '../../shared/events/eventBus';
import apiRouter from './src/api/routes';

// Lazy-loaded outbox processor reference for graceful shutdown
let outboxProcessorRef: { stop: () => void } | null = null;

export const EnablerModule: Module = {
    name: 'enabler-service',
    initialize: async () => {
        appLogger.info('Initializing enabler-service module');

        try {
            // ── Outbox processor ──────────────────────────────────────────────
            // Drains the enabler_OutboxEvent table and publishes events to the
            // shared event bus so downstream services (order-service, wallet-service)
            // can react to enabler domain events.
            const { createPrismaClient } = await import('@shared/database/prisma-client');
            const { TransactionalOutbox } = await import('../../shared/outbox/outboxPattern');
            const { OutboxProcessor } = await import('../../shared/outbox/outbox.processor');

            const prisma = createPrismaClient();
            const outbox = new TransactionalOutbox(prisma, 'enabler_OutboxEvent');
            const outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'enabler-service');
            outboxProcessor.start();
            outboxProcessorRef = outboxProcessor;
            appLogger.info('Enabler-service outbox processor started');

            // ── Order status event listener ───────────────────────────────────
            // When an order facilitated by an enabler is delivered, update the
            // enabler's performance metrics (totalOrders, totalSales, conversionRate).
            eventBus.subscribe('OrderDelivered', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { orderId, enablerId, totalAmount } = data;

                    // Only process orders that have an enablerId attribution
                    if (!orderId || !enablerId) return;

                    const { PrismaEnablerRepository } = await import('./src/infrastructure/repositories/prisma-enabler.repository');
                    const { PrismaEnablerOrderRepository } = await import('./src/infrastructure/repositories/prisma-enabler-order.repository');

                    const enablerRepo = new PrismaEnablerRepository();
                    const orderRepo = new PrismaEnablerOrderRepository();

                    // Mark the enabler order as completed (findByOrderId returns single entity)
                    const enablerOrder = await orderRepo.findByOrderId(orderId);
                    if (enablerOrder) {
                        // Force to COMPLETED regardless of current state — the order-service
                        // is the source of truth for order status. We update directly via
                        // the repository to avoid state-machine guards that assume in-process flow.
                        const plain = enablerOrder.toPlainObject();
                        plain.status = 'COMPLETED' as any;
                        plain.updatedAt = new Date();
                        const updated = (await import('./src/domain/entities/enabler-order.entity')).EnablerOrderEntity.create(plain);
                        await orderRepo.update(updated);
                    }

                    // Update enabler aggregate metrics
                    const enabler = await enablerRepo.findById(enablerId);
                    if (enabler) {
                        const amount = Number(totalAmount?.amount ?? totalAmount ?? 0);
                        // updatePerformanceMetrics(sales, orders, rating, conversionRate)
                        // Increment sales and orders; keep existing rating and conversionRate
                        enabler.updatePerformanceMetrics(
                            amount,
                            1,
                            enabler.toPlainObject().customerRating ?? 0,
                            enabler.conversionRate,
                        );
                        await enablerRepo.update(enabler);
                    }

                    appLogger.info(`[EnablerService] OrderDelivered processed for enabler ${enablerId}, order ${orderId}`);
                } catch (err: any) {
                    appLogger.warn('[EnablerService] OrderDelivered handler failed', { error: err.message });
                }
            });

            // ── Order cancellation listener ───────────────────────────────────
            eventBus.subscribe('OrderCancelled', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { orderId, enablerId } = data;

                    if (!orderId || !enablerId) return;

                    const { PrismaEnablerOrderRepository } = await import('./src/infrastructure/repositories/prisma-enabler-order.repository');
                    const orderRepo = new PrismaEnablerOrderRepository();

                    const enablerOrder = await orderRepo.findByOrderId(orderId);
                    if (enablerOrder) {
                        const plain = enablerOrder.toPlainObject();
                        plain.status = 'CANCELLED' as any;
                        plain.cancelledAt = new Date();
                        plain.cancellationReason = 'OrderCancelled event received';
                        plain.updatedAt = new Date();
                        const updated = (await import('./src/domain/entities/enabler-order.entity')).EnablerOrderEntity.create(plain);
                        await orderRepo.update(updated);
                    }

                    appLogger.info(`[EnablerService] OrderCancelled processed for enabler ${enablerId}, order ${orderId}`);
                } catch (err: any) {
                    appLogger.warn('[EnablerService] OrderCancelled handler failed', { error: err.message });
                }
            });

            appLogger.info('Enabler-service event listeners registered');
        } catch (error) {
            // Log but don't crash — routes are still served even if event wiring fails
            appLogger.error('Enabler-service initialization error (non-fatal)', { error });
        }
    },
    routes: apiRouter,
    shutdown: async () => {
        appLogger.info('Shutting down enabler-service module');
        if (outboxProcessorRef) {
            outboxProcessorRef.stop();
        }
    }
};
