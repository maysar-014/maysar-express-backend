import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { healthRoutes } from './src/api/routes/health.routes';
import { DependencyContainer } from './src/infrastructure/container';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { ConsolidationOrchestrator } from './src/application/services/consolidation-orchestrator.service';
import { GeoPoint } from './src/domain/value-objects/geopoint.value-object';

import { makeId } from '../../shared/ids/id';

export const LogisticsModule: Module = {
    name: 'logistics-service',
    initialize: async () => {
        logger.info('Initializing logistics-service module');
        try {
            const container = DependencyContainer.getInstance();
            await container.initializeDatabaseConnections();
        } catch (error) {
            logger.warn('Logistics dependency initialization failed:', error);
        }

        // ── Register ConsolidationOrchestrator globally ──────────────────────
        // The orchestrator delegates quote generation to RequestDeliveryQuoteUseCase
        // and uses a straight-line (Haversine-based) routing provider as fallback.
        try {
            const { RequestDeliveryQuoteUseCase } = await import('./src/application/use-cases/request-delivery-quote.use-case');
            const prisma = (globalThis as any).prisma;

            const haversineRoutingProvider = {
                async getRoute(from: any, to: any) {
                    const dist = from.distanceTo(to);
                    return { distanceKm: dist * 1.35, durationMinutes: Math.ceil(dist * 1.35 / 30 * 60), source: 'fallback' as const };
                },
            };

            const { DeliveryPricingEngine } = await import('./src/domain/engines/delivery-pricing.engine');
            const { CourierCostCalculator } = await import('./src/domain/engines/courier-cost-calculator');
            const { ZoneClassifier } = await import('./src/domain/services/zone-classifier');
            const { PrismaQuoteRepository } = await import('./src/infrastructure/repositories/prisma-quote.repository');
            const { PrismaPricingConfigRepository } = await import('./src/infrastructure/repositories/prisma-pricing-config.repository');
            const { PrismaPricingAuditRecordRepository } = await import('./src/infrastructure/repositories/prisma-pricing-audit-record.repository');

            const quoteUseCase = new RequestDeliveryQuoteUseCase(
                new DeliveryPricingEngine(),
                new CourierCostCalculator(),
                new ZoneClassifier(),
                haversineRoutingProvider,
                new PrismaQuoteRepository(),
                new PrismaPricingConfigRepository(),
                new PrismaPricingAuditRecordRepository(),
            );
            const requestDeliveryQuote = async (params: {
                pickupPoints: GeoPoint[];
                destination: GeoPoint;
                totalWeightKg: number;
                isCoD: boolean;
                deliveryGroupId: string;
                sellerOrderIds: string[];
            }): Promise<{ quoteId: string; deliveryFee: number; pricingVersion: number }> => {
                const [origin, ...additionalPickupPoints] = params.pickupPoints;
                const result = await quoteUseCase.execute({
                    originLat: origin.getLatitude(),
                    originLng: origin.getLongitude(),
                    originAddress: origin.getAddress(),
                    destinationLat: params.destination.getLatitude(),
                    destinationLng: params.destination.getLongitude(),
                    destinationAddress: params.destination.getAddress(),
                    packageWeightKg: params.totalWeightKg,
                    isCoD: params.isCoD,
                    deliveryGroupId: params.deliveryGroupId,
                    additionalPickupPoints: additionalPickupPoints.map((p: any) => ({ lat: p.getLatitude(), lng: p.getLongitude(), address: p.getAddress() })),
                });
                return {
                    quoteId: result.quoteId,
                    deliveryFee: result.deliveryFee ?? 0,
                    pricingVersion: result.pricingVersion,
                };
            };

            // Append-only outbox publisher for consolidation analytics events —
            // same logistics_OutboxEvent pattern as shipment.created. The
            // orchestrator already .catch()es publish failures (non-fatal).
            const outboxEventBus = {
                async publish(type: string, data: any): Promise<void> {
                    const prisma = (globalThis as any).prisma;
                    if (!prisma?.logistics_OutboxEvent?.create) return;
                    const { randomUUID } = await import('crypto');
                    await prisma.logistics_OutboxEvent.create({
                        data: { eventId: randomUUID(), eventType: type, eventData: data },
                    });
                },
            };

            const orchestrator = new ConsolidationOrchestrator(haversineRoutingProvider, requestDeliveryQuote, outboxEventBus);
            (globalThis as any).__consolidationOrchestrator = orchestrator;
            logger.info('ConsolidationOrchestrator registered on globalThis');

            // ── Register shipment creation for checkout confirmation ────────────
            // Called by checkout-service after order creation (Phase 2 §2.1):
            // creates one Logistics_Shipment per seller group and emits
            // shipment.created to the logistics outbox.
            const { CreateOrderShipmentsUseCase } = await import('./src/application/use-cases/create-order-shipments.use-case');
            const createOrderShipments = new CreateOrderShipmentsUseCase();
            (globalThis as any).__createOrderShipments = (request: any) => createOrderShipments.execute(request);
            logger.info('CreateOrderShipmentsUseCase registered on globalThis');

            // ── Register the Phase 3 §3.4 price lock ─────────────────────────────
            // Called by checkout-service at confirmation: locks the displayed
            // buyer price against the quote. The locked price is absolute —
            // post-confirmation optimization savings are Maysar's.
            const { FulfillmentCommitment } = await import('./src/domain/entities/fulfillment-commitment.entity');
            const { PrismaFulfillmentCommitmentRepository } = await import('./src/infrastructure/repositories/prisma-cost-model.repository');
            const commitmentRepo = new PrismaFulfillmentCommitmentRepository();
            (globalThis as any).__lockFulfillmentPrice = async (params: {
                checkoutSessionId: string;
                quoteId: string;
                buyerPriceTzs: number;
                pricingVersion: number;
                expiresAt: Date;
            }) => {
                const commitment = FulfillmentCommitment.create({
                    id: makeId('cmt'),
                    checkoutSessionId: params.checkoutSessionId,
                    quoteId: params.quoteId,
                    buyerPriceTzs: params.buyerPriceTzs,
                    pricingVersion: params.pricingVersion,
                    expiresAt: params.expiresAt,
                });
                await commitmentRepo.save(commitment);
                return commitment.id;
            };
            logger.info('FulfillmentCommitment price lock registered on globalThis');
        } catch (err: any) {
            logger.warn('ConsolidationOrchestrator initialization failed (non-fatal):', err?.message);
        }

        // ── Register BuyerProfileService (Phase 6 §6.3) ──────────────────────
        // Delivery-event consumers call __recordBuyerDeliveryOutcome on every
        // DeliveryConfirmed / DeliveryFailed; the profile feeds failure-risk
        // ranking. Non-fatal registration.
        try {
            const { BuyerProfileService } = await import('./src/application/services/buyer-profile.service');
            const { PrismaBuyerProfileRepository } = await import('./src/infrastructure/repositories/prisma-buyer-profile.repository');
            const buyerProfiles = new BuyerProfileService(new PrismaBuyerProfileRepository());
            (globalThis as any).__recordBuyerDeliveryOutcome = async (params: {
                buyerId: string;
                success: boolean;
                weightKg?: number;
                windowBucket?: string;
                choseShared?: boolean;
            }) => buyerProfiles.recordDeliveryOutcome(params.buyerId, {
                success: params.success,
                weightKg: params.weightKg,
                windowBucket: params.windowBucket,
                choseShared: params.choseShared,
            });
            logger.info('BuyerProfileService registered on globalThis (__recordBuyerDeliveryOutcome)');
        } catch (err: any) {
            logger.warn('BuyerProfileService initialization failed (non-fatal):', err?.message);
        }

        // ── Register SettlementLifecycleService (Phase 3 runtime wiring) ──────
        // Delivery-event consumers call __settlementService.recordAdjustment /
        // writeJobCompletionLedger / settle. Non-fatal registration.
        try {
            const { SettlementLifecycleService } = await import('./src/application/services/settlement-lifecycle.service');
            (globalThis as any).__settlementService = new SettlementLifecycleService();
            logger.info('SettlementLifecycleService registered on globalThis (__settlementService)');
        } catch (err: any) {
            logger.warn('SettlementLifecycleService initialization failed (non-fatal):', err?.message);
        }

        // ── Subscribe to order.seller_verified → auto-create delivery ─────────
        // When a seller verifies an order, logistics creates a delivery record
        // so the buyer can track it and the courier can pick it up.
        try {
            const { eventBus } = await import('../../shared/events/eventBus');
            const { CreateDeliveryUseCase } = await import('./src/application/use-cases/create-delivery.use-case');
            const { PrismaCourierRepository } = await import('./src/infrastructure/repositories/prisma-courier.repository');
            const { LogisticsEngine } = await import('./src/domain/engines/logistics.engine');
            const { CourierAssignmentPolicy } = await import('./src/domain/policies/courier-assignment.policy');
            const { CourierSelectionEngine } = await import('./src/domain/engines/courier-selection.engine');

            const prisma = (globalThis as any).prisma;
            const courierRepo = new PrismaCourierRepository(prisma);
            const logisticsEngine = new LogisticsEngine();
            const courierSelection = new CourierSelectionEngine(courierRepo, new CourierAssignmentPolicy());
            const createDelivery = new CreateDeliveryUseCase(courierRepo, logisticsEngine, courierSelection);

            eventBus.subscribe('order.seller_verified', {
                name: 'logistics-order-verified-create-delivery',
                handler: async (envelope: any) => {
                    const data = envelope?.data ?? envelope?.payload ?? envelope;
                    const orderId = data?.orderId;
                    if (!orderId) return;

                    try {
                        // Fetch order details to get addresses
                        const order = await prisma.order_Order.findUnique({
                            where: { id: orderId },
                            select: {
                                id: true,
                                buyerId: true,
                                sellerId: true,
                                deliveryAddress: true,
                                totalWeight: true,
                                logisticsEstimate: true,
                            },
                        });
                        if (!order) return;

                        // Check if delivery already exists for this order
                        const existing = await prisma.logistics_Delivery?.findFirst?.({
                            where: { orderId },
                            select: { id: true },
                        });
                        if (existing) return; // idempotent

                        // Parse delivery address (stored as JSON)
                        const addr = typeof order.deliveryAddress === 'string'
                            ? JSON.parse(order.deliveryAddress)
                            : order.deliveryAddress || {};

                        await createDelivery.execute({
                            orderId,
                            pickupLocation: {
                                lat: -6.7924,
                                lng: 39.2083,
                                address: 'Seller location, Dar es Salaam',
                            },
                            deliveryLocation: {
                                lat: Number(addr.latitude ?? addr.lat ?? -6.8235),
                                lng: Number(addr.longitude ?? addr.lng ?? 39.2695),
                                address: addr.street || addr.city || 'Dar es Salaam',
                            },
                            weight: Number(order.totalWeight ?? 1.0),
                            priority: 'standard',
                        });

                        logger.info(`Delivery auto-created for verified order ${orderId}`);
                    } catch (err: any) {
                        logger.warn(`Auto-delivery creation failed for order ${orderId}`, { error: err?.message });
                    }
                },
            });
            logger.info('Order-verified → delivery subscriber registered');
        } catch (err: any) {
            logger.warn('Order-verified subscriber initialization failed (non-fatal):', err?.message);
        }

        // ── Start the PoolOptimizationJob (Phase 5 §5.3) ─────────────────────
        // Scheduled scan of the shipment opportunity pool (configurable
        // interval, default 5 min). Non-fatal on failure; stopped on shutdown.
        try {
            const { PoolOptimizationJob } = await import('./src/application/services/shipment-pool.service');
            const intervalMs = Number(process.env.POOL_OPTIMIZATION_INTERVAL_MS) || undefined;
            const poolJob = new PoolOptimizationJob(intervalMs);
            poolJob.start();
            (globalThis as any).__poolOptimizationJob = poolJob;
            logger.info(`PoolOptimizationJob started (interval ${intervalMs ?? 300000}ms)`);
        } catch (err: any) {
            logger.warn('PoolOptimizationJob initialization failed (non-fatal):', err?.message);
        }
    },
    routes: (() => {
        const router = Router();
        router.use('/health', healthRoutes);
        router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());

        try {
            // Lazy load to avoid env-dependent side effects during module import
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const logisticsRoutes = require('./src/api/routes/logistics.routes').default;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const courierRoutes = require('./src/api/routes/courier.routes').default;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { publicQuoteRouter, internalQuoteRouter } = require('./src/api/routes/quote.routes');

        router.use('/api/v1', requireAuth, logisticsRoutes);
            router.use('/api/courier', requireAuth, courierRoutes);

            // Admin: seed a COD delivery directly (for testing / lifecycle verification).
            // POST /api/logistics/admin/cod-delivery
            // Requires: admin role. Creates a logistics_Delivery row with isCOD:true.
            router.post('/admin/cod-delivery', requireAuth, requireRoleOrService(['admin']), async (req, res) => {
                const prisma = (globalThis as any).prisma;
                if (!prisma?.logistics_Delivery) {
                    res.status(503).json({ success: false, error: 'logistics_Delivery model not available' });
                    return;
                }
                try {
                    const {
                        orderId,
                        courierId = 'usr_01KRFZ1E7W4JDR9N9PMGYDD77S', // seeded courier
                        buyerId,
                        sellerId,
                        codAmount = 15000,
                    } = req.body;
                    if (!orderId || !buyerId || !sellerId) {
                        res.status(400).json({ success: false, error: 'orderId, buyerId, sellerId are required' });
                        return;
                    }
                    // Deterministic ID based on orderId so this is idempotent.
                    const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
                    let state = 0x811c9dc5 >>> 0;
                    const seedStr = `cod_${orderId}`;
                    for (let i = 0; i < seedStr.length; i++) {
                        state ^= seedStr.charCodeAt(i);
                        state = Math.imul(state, 0x01000193) >>> 0;
                    }
                    let suffix = '';
                    for (let i = 0; i < 26; i++) {
                        state = (Math.imul(state ^ (state >>> 15), 0x2545f491) + i * 0x9e3779b1) >>> 0;
                        suffix += CROCKFORD[state % CROCKFORD.length];
                    }
                    const deliveryId = `log_del_${suffix}`;

                    const data = {
                        orderId,
                        courierId,
                        buyerId,
                        sellerId,
                        status: 'assigned',
                        isCOD: true,
                        codAmount,
                        codCurrency: 'TZS',
                        codCommitmentHoldId: null,
                        pickupStreet: 'Uhuru Street 1',
                        pickupCity: 'Dar es Salaam',
                        pickupRegion: 'Dar es Salaam',
                        pickupLatitude: -6.7924,
                        pickupLongitude: 39.2083,
                        pickupContactName: 'Lifecycle Pickup',
                        pickupContactPhone: '+255700000001',
                        deliveryStreet: 'Kariakoo Market',
                        deliveryCity: 'Dar es Salaam',
                        deliveryRegion: 'Dar es Salaam',
                        deliveryLatitude: -6.81,
                        deliveryLongitude: 39.28,
                        deliveryContactName: 'Lifecycle Delivery',
                        deliveryContactPhone: '+255700000002',
                        packageWeight: 1.0,
                        packageValue: codAmount,
                        estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                        otp: null,
                        otpExpiresAt: null,
                    };

                    await prisma.logistics_Delivery.upsert({
                        where: { id: deliveryId },
                        update: { ...data, updatedAt: new Date() },
                        create: { id: deliveryId, ...data, createdAt: new Date(), updatedAt: new Date() },
                    });

                    res.status(201).json({ success: true, data: { deliveryId, isCOD: true } });
                } catch (err: any) {
                    res.status(500).json({ success: false, error: err?.message ?? 'Failed to create COD delivery' });
                }
            });

            // Admin: read OTP for a delivery (non-production only, for lifecycle verification).
            // GET /api/logistics/admin/deliveries/:deliveryId/otp
            router.get('/admin/deliveries/:deliveryId/otp', requireAuth, requireRoleOrService(['admin']), async (req, res) => {
                if (process.env.NODE_ENV === 'production') {
                    res.status(403).json({ success: false, error: 'Not available in production' });
                    return;
                }
                const prisma = (globalThis as any).prisma;
                if (!prisma?.logistics_Delivery) {
                    res.status(503).json({ success: false, error: 'logistics_Delivery model not available' });
                    return;
                }
                try {
                    const row = await prisma.logistics_Delivery.findUnique({
                        where: { id: req.params.deliveryId },
                        select: { otp: true, otpExpiresAt: true, status: true, isCOD: true },
                    });
                    if (!row) {
                        res.status(404).json({ success: false, error: 'Delivery not found' });
                        return;
                    }
                    res.json({ success: true, data: { otp: row.otp, otpExpiresAt: row.otpExpiresAt, status: row.status, isCOD: row.isCOD } });
                } catch (err: any) {
                    res.status(500).json({ success: false, error: err?.message ?? 'Failed to read OTP' });
                }
            });

            // Delivery quote endpoints
            // Full path: POST /api/logistics/v1/quote  (module is mounted at /api/logistics by app.ts)
            //            POST /api/logistics/v1/fulfillment-options (Phase 4 §4.1)
            router.use('/v1', publicQuoteRouter);

            // Internal service-to-service quote endpoints (no JWT — network-level protection)
            // Full path: GET  /api/logistics/internal/quotes/:quoteId
            //            PATCH /api/logistics/internal/quotes/:quoteId/consume
            router.use('/internal', internalQuoteRouter);

            // Driver matching (Phase 5 §5.1) — internal, platform-only.
            // Full path: POST /api/logistics/internal/jobs/:jobId/match-drivers
            const { default: driverMatchingRoutes } = require('./src/api/routes/driver-matching.routes');
            const { default: kpiRoutes } = require('./src/api/routes/kpi.routes');
            router.use('/internal', requireRoleOrService(['admin', 'system']), driverMatchingRoutes);
            // KPI snapshot (Phase 6 §6.2) — internal, platform-only.
            // Full path: GET /api/logistics/internal/kpis
            router.use('/internal', requireRoleOrService(['admin', 'system']), kpiRoutes);
        } catch (error) {
            logger.warn('Failed to mount logistics routes, falling back to degraded handler:', error);
            router.all('/api/v1/*', (_req, res) => {
                res.status(503).json({
                    success: false,
                    error: 'Logistics routes unavailable',
                    reason: 'Initialization failure'
                });
            });
        }

        return router;
    })(),
    shutdown: async () => {
        const poolJob = (globalThis as any).__poolOptimizationJob;
        if (poolJob?.stop) poolJob.stop();
        logger.info('Shutting down logistics-service module');
    }
};
