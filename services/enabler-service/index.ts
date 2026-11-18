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
            // When an order facilitated by an enabler is delivered:
            //   1. Advance Enabler_Earning: ATTRIBUTED → QUALIFIED (§29 earning lifecycle)
            //   2. Mark Enabler_Order as COMPLETED
            //   3. Update enabler aggregate metrics
            eventBus.subscribe('OrderDelivered', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { orderId, totalAmount } = data;
                    let enablerId = data.enablerId;

                    // Look up earning by orderId — also gives us enablerId if not in event payload.
                    // The UNIQUE constraint on orderId makes this safe and idempotent.
                    let earningRow: { enablerId: string; status: string; id: string } | null = null;
                    if (orderId) {
                        earningRow = await prisma.enabler_Earning.findUnique({
                            where: { orderId },
                            select: { enablerId: true, status: true, id: true },
                        }).catch(() => null);
                        if (earningRow) enablerId = earningRow.enablerId;
                    }

                    // Only process orders that have an enablerId attribution
                    if (!orderId || !enablerId) return;

                    // ── Step 1: Qualify the earning (ATTRIBUTED → QUALIFIED) ──────────
                    // Only advance if still in ATTRIBUTED state — idempotent guard.
                    if (earningRow && earningRow.status === 'ATTRIBUTED') {
                        const holdUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10-day fraud hold
                        await prisma.enabler_Earning.update({
                            where: { orderId },
                            data: {
                                status: 'QUALIFIED',
                                qualifiedAt: new Date(),
                                // availableAt is set after the hold period clears
                                availableAt: holdUntil,
                                updatedAt: new Date(),
                            },
                        }).catch((err: any) => {
                            appLogger.warn('[EnablerService] Could not qualify earning for order ' + orderId, { error: err.message });
                        });
                        appLogger.info(`[EnablerService] Enabler_Earning QUALIFIED for order ${orderId}, enablerId ${enablerId}`);
                    }

                    const { PrismaEnablerRepository } = await import('./src/infrastructure/repositories/prisma-enabler.repository');
                    const { PrismaEnablerOrderRepository } = await import('./src/infrastructure/repositories/prisma-enabler-order.repository');

                    const enablerRepo = new PrismaEnablerRepository();
                    const orderRepo = new PrismaEnablerOrderRepository();

                    // ── Step 2: Mark the enabler order COMPLETED ──────────────────────
                    const enablerOrder = await orderRepo.findByOrderId(orderId);
                    if (enablerOrder) {
                        const plain = enablerOrder.toPlainObject();
                        plain.status = 'COMPLETED' as any;
                        plain.updatedAt = new Date();
                        const updated = (await import('./src/domain/entities/enabler-order.entity')).EnablerOrderEntity.create(plain);
                        await orderRepo.update(updated);
                    }

                    // ── Step 3: Update enabler aggregate metrics ───────────────────────
                    const enabler = await enablerRepo.findById(enablerId);
                    if (enabler) {
                        const amount = Number(totalAmount?.amount ?? totalAmount ?? 0);
                        enabler.updatePerformanceMetrics(
                            amount,
                            1,
                            enabler.toPlainObject().customerRating ?? 0,
                            enabler.conversionRate,
                        );
                        await enablerRepo.update(enabler);
                    }

                    appLogger.info(`[EnablerService] OrderDelivered fully processed for enabler ${enablerId}, order ${orderId}`);
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

                    // Cancel any ATTRIBUTED or QUALIFIED earnings — no payout on cancelled orders.
                    // AVAILABLE/PAID earnings must NOT be reversed here — they require a
                    // separate admin dispute resolution flow.
                    await prisma.enabler_Earning.updateMany({
                        where: {
                            orderId,
                            status: { in: ['ATTRIBUTED', 'QUALIFIED', 'PENDING'] },
                        },
                        data: {
                            status: 'CANCELLED',
                            reversalReason: 'Order cancelled by platform/buyer/seller',
                            reversedAt: new Date(),
                            updatedAt: new Date(),
                        },
                    }).catch((err: any) => {
                        appLogger.warn(`[EnablerService] Could not cancel earning for order ${orderId}`, { error: err.message });
                    });

                    appLogger.info(`[EnablerService] OrderCancelled processed for enabler ${enablerId}, order ${orderId}`);
                } catch (err: any) {
                    appLogger.warn('[EnablerService] OrderCancelled handler failed', { error: err.message });
                }
            });

            appLogger.info('Enabler-service event listeners registered');

            // ── Earning release sweeper ───────────────────────────────────────
            // Runs every 6 hours. Finds QUALIFIED earnings whose hold period has
            // expired (availableAt <= now) and credits the enabler's wallet.
            // This is the bridge between QUALIFIED → AVAILABLE → PAID.
            const runEarningRelease = async () => {
                try {
                    const now = new Date();
                    const releasable = await prisma.enabler_Earning.findMany({
                        where: {
                            status: 'QUALIFIED',
                            availableAt: { lte: now },
                        },
                        select: {
                            id: true, enablerId: true, orderId: true, amount: true, currency: true,
                        },
                        take: 50, // process in small batches
                    }).catch(() => [] as any[]);

                    for (const row of releasable) {
                        try {
                            // Credit the enabler's wallet via wallet service
                            const walletServiceUrl = process.env.INTERNAL_BASE_URL || 'http://localhost:3000';
                            const { randomUUID } = await import('crypto');
                            const idempotencyKey = `enabler-earning-release-${row.id}`;

                            const walletRes = await fetch(`${walletServiceUrl}/api/wallet/wallets/${row.enablerId}/credit`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.ALLOWED_SERVICE_KEYS?.split(',')[0] ?? '' },
                                body: JSON.stringify({
                                    userId: row.enablerId,
                                    amount: Number(row.amount),
                                    currency: row.currency ?? 'TZS',
                                    description: `Enabler earning for order ${row.orderId}`,
                                    referenceType: 'enabler_earning',
                                    referenceId: row.id,
                                    idempotencyKey,
                                    correlationId: randomUUID(),
                                    metadata: { source: 'enabler_earning_release', orderId: row.orderId },
                                }),
                            }).catch(() => null);

                            if (walletRes?.ok) {
                                const walletData = await walletRes.json().catch(() => null) as any;
                                const txnId = walletData?.data?.id ?? walletData?.id ?? null;

                                // Advance earning to AVAILABLE and record wallet transaction ID
                                await prisma.enabler_Earning.update({
                                    where: { id: row.id },
                                    data: {
                                        status: 'AVAILABLE',
                                        walletTransactionId: txnId,
                                        updatedAt: new Date(),
                                    },
                                });
                                appLogger.info(`[EnablerService] Earning ${row.id} released to wallet for enabler ${row.enablerId}`);
                            } else {
                                appLogger.warn(`[EnablerService] Wallet credit failed for earning ${row.id}`);
                            }
                        } catch (rowErr: any) {
                            appLogger.warn(`[EnablerService] Earning release failed for row ${row.id}`, { error: rowErr.message });
                        }
                    }
                    if (releasable.length > 0) {
                        appLogger.info(`[EnablerService] Earning sweeper: released ${releasable.length} earnings`);
                    }
                } catch (err: any) {
                    appLogger.warn('[EnablerService] Earning sweeper error', { error: err.message });
                }
            };

            // Run immediately at startup, then every 6 hours
            void runEarningRelease();
            const earningSweeperInterval = setInterval(runEarningRelease, 6 * 60 * 60 * 1000);

            // Store ref for clean shutdown
            (global as any).__enablerEarningSweeperInterval = earningSweeperInterval;
            appLogger.info('Enabler earning release sweeper started (6-hour interval)');
        } catch (error) {
            // Log but don't crash — routes are still served even if event wiring fails
            appLogger.error(`Enabler-service initialization error (non-fatal): ${error instanceof Error ? error.message : String(error)}`, { errDetail: error instanceof Error ? { name: error.name, stack: error.stack?.split('\n').slice(0, 4).join(' | ') } : String(error) });
        }
    },
    routes: apiRouter,
    shutdown: async () => {
        appLogger.info('Shutting down enabler-service module');
        if (outboxProcessorRef) {
            outboxProcessorRef.stop();
        }
        // Stop the earning release sweeper
        const sweeperInterval = (global as any).__enablerEarningSweeperInterval;
        if (sweeperInterval) {
            clearInterval(sweeperInterval);
            (global as any).__enablerEarningSweeperInterval = null;
            appLogger.info('Enabler earning sweeper stopped');
        }
    }
};
