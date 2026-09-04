import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { healthRoutes } from './src/api/routes/health.routes';
import { DependencyContainer } from './src/infrastructure/container';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { ConsolidationOrchestrator } from './src/application/services/consolidation-orchestrator.service';
import { makeId } from '../shared/ids/id';

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
                    return { distanceKm: dist * 1.35, durationMinutes: Math.ceil(dist * 1.35 / 30 * 60) };
                },
            };

            const quoteUseCase = new RequestDeliveryQuoteUseCase();
            const requestDeliveryQuote = async (params: {
                pickupPoints: any[];
                destination: any;
                totalWeightKg: number;
                isCoD: boolean;
                deliveryGroupId: string;
                sellerOrderIds: string[];
            }) => {
                const result = await quoteUseCase.execute({
                    pickupPoints: params.pickupPoints,
                    destination: params.destination,
                    totalWeightKg: params.totalWeightKg,
                    isCoD: params.isCoD,
                    deliveryGroupId: params.deliveryGroupId,
                    sellerOrderIds: params.sellerOrderIds,
                });
                return {
                    quoteId: result.quoteId,
                    deliveryFee: result.deliveryFee,
                    pricingVersion: result.pricingVersion,
                };
            };

            const orchestrator = new ConsolidationOrchestrator(haversineRoutingProvider, requestDeliveryQuote);
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

            // Delivery quote endpoints
            // Full path: POST /api/logistics/v1/quote  (module is mounted at /api/logistics by app.ts)
            router.use('/v1', publicQuoteRouter);

            // Internal service-to-service quote endpoints (no JWT — network-level protection)
            // Full path: GET  /api/logistics/internal/quotes/:quoteId
            //            PATCH /api/logistics/internal/quotes/:quoteId/consume
            router.use('/internal', internalQuoteRouter);
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
        logger.info('Shutting down logistics-service module');
    }
};
