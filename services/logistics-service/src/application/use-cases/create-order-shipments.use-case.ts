/**
 * CreateOrderShipmentsUseCase (Phase 2 §2.1)
 *
 * Called at checkout confirmation (after order creation) to create one
 * Logistics_Shipment per seller group — the seller's primary location as
 * origin, the buyer delivery address as destination. `deliveryJobId` stays
 * null here; the consolidation engine sets it when shipments are assigned
 * to jobs.
 *
 * Emits one `shipment.created` event per shipment to the logistics outbox
 * (Logistics_OutboxEvent, append-only). The order service subscribes and
 * records the shipment reference.
 *
 * Registered globally by the logistics module as `__createOrderShipments`
 * so the checkout-service can invoke it without a network hop (same pattern
 * as `__consolidationOrchestrator`).
 */

import { randomUUID } from 'crypto';
import { Shipment, VehicleClass } from '../../domain/entities/shipment.entity';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { PrismaShipmentRepository } from '../../infrastructure/repositories/prisma-shipment.repository';
import { PrismaDeliveryJobRepository } from '../../infrastructure/repositories/prisma-delivery-job.repository';
import { PrismaVehicleTariffRepository } from '../../infrastructure/repositories/prisma-vehicle-tariff.repository';
import { PrismaRouteInsertionCandidateRepository } from '../../infrastructure/repositories/prisma-phase5.repository';
import { ShipmentPoolService } from '../services/shipment-pool.service';

export interface SellerShipmentInput {
  sellerId: string;
  sellerOrderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  packageWeightKg: number;
  requiredVehicleClass?: VehicleClass | null;
}

export interface CreateOrderShipmentsRequest {
  masterOrderId: string;
  buyer: { lat?: number; lng?: number; address?: string };
  sellers: SellerShipmentInput[];
  /** Buyer's delivery-window preference (Phase 4 §4.1). */
  deliveryWindowPreference?: 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';
  /** When the buyer confirmed (defaults to now) — window is computed from this. */
  confirmedAt?: Date;
}

export interface CreateOrderShipmentsResult {
  created: number;
  shipmentIds: string[];
  eventsEmitted: number;
}

// Dar es Salaam city-centre fallback (same convention as GetDeliveryOptionsUseCase)
const FALLBACK_BUYER = { lat: -6.7924, lng: 39.2083, address: 'Dar es Salaam, Tanzania' };

export type DeliveryWindowPreference = 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';

/**
 * Compute the requested delivery window [earliestAt, latestAt] for a buyer's
 * window preference (Phase 4 §4.1). All durations are relative to the
 * confirmation time:
 *   FLEXIBLE  same/next-day — a generous next-day window (e.g. 08:00–22:00)
 *   STANDARD  a 4-hour window starting tomorrow 09:00
 *   EXPRESS   a 2-hour window starting in ~3 hours (same-day)
 */
export function computeRequestedDeliveryWindow(
  preference: DeliveryWindowPreference | undefined,
  confirmedAt: Date,
): { earliestAt: Date; latestAt: Date } | null {
  if (!preference) return null;
  const confirmed = new Date(confirmedAt);

  switch (preference) {
    case 'EXPRESS': {
      const earliestAt = new Date(confirmed.getTime() + 3 * 60 * 60 * 1000);
      return { earliestAt, latestAt: new Date(earliestAt.getTime() + 2 * 60 * 60 * 1000) };
    }
    case 'STANDARD': {
      // 4-hour window starting tomorrow 09:00.
      const earliestAt = new Date(confirmed);
      earliestAt.setDate(earliestAt.getDate() + 1);
      earliestAt.setHours(9, 0, 0, 0);
      return { earliestAt, latestAt: new Date(earliestAt.getTime() + 4 * 60 * 60 * 1000) };
    }
    case 'FLEXIBLE':
    default: {
      // Same/next-day generous window: next day 08:00 → 22:00.
      const earliestAt = new Date(confirmed);
      earliestAt.setDate(earliestAt.getDate() + 1);
      earliestAt.setHours(8, 0, 0, 0);
      const latestAt = new Date(earliestAt);
      latestAt.setHours(22, 0, 0, 0);
      return { earliestAt, latestAt };
    }
  }
}

export class CreateOrderShipmentsUseCase {
  private readonly shipmentRepo = new PrismaShipmentRepository();
  private readonly pool = new ShipmentPoolService();

  async execute(request: CreateOrderShipmentsRequest): Promise<CreateOrderShipmentsResult> {
    const prisma = (globalThis as any).prisma;
    if (!prisma || !request?.sellers?.length) {
      return { created: 0, shipmentIds: [], eventsEmitted: 0 };
    }

    const buyer = GeoPoint.create(
      Number(request.buyer?.lat) || FALLBACK_BUYER.lat,
      Number(request.buyer?.lng) || FALLBACK_BUYER.lng,
      request.buyer?.address || FALLBACK_BUYER.address,
    );

    const requestedWindow = computeRequestedDeliveryWindow(
      request.deliveryWindowPreference,
      request.confirmedAt ?? new Date(),
    );

    const shipmentIds: string[] = [];
    let eventsEmitted = 0;

    for (const seller of request.sellers) {
      try {
        const shipment = Shipment.create({
          orderId: seller.sellerOrderId || request.masterOrderId,
          sellerId: seller.sellerId,
          origin: GeoPoint.create(Number(seller.pickupLat), Number(seller.pickupLng), seller.pickupAddress || ''),
          destination: buyer,
          packageWeightKg: Number(seller.packageWeightKg) || 0.5,
          requiredVehicleClass: seller.requiredVehicleClass ?? null,
          requestedDeliveryWindow: requestedWindow,
        });
        await this.shipmentRepo.save(shipment);
        shipmentIds.push(shipment.id);

        // ── Shipment pool maintenance (Phase 5 §5.3) ──────────────────────────
        // Every Shipment state change refreshes the opportunity pool.
        try {
          await this.pool.refresh(shipment as any);
        } catch (poolErr: any) {
          console.error('[CreateOrderShipmentsUseCase] pool refresh failed (non-fatal):', poolErr?.message);
        }

        // ── Route insertion check (Phase 5 §5.2) ─────────────────────────────
        // New shipment entering the pool → evaluate insertion into each
        // compatible active job's route; every evaluation is persisted.
        try {
          const { EvaluateRouteInsertionsUseCase } = await import('./evaluate-route-insertions.use-case');
          const evaluateInsertions = new EvaluateRouteInsertionsUseCase(
            this.shipmentRepo,
            new PrismaDeliveryJobRepository(),
            new PrismaVehicleTariffRepository(),
            new PrismaRouteInsertionCandidateRepository(),
          );
          await evaluateInsertions.execute(shipment.id);
        } catch (insertionErr: any) {
          console.error('[CreateOrderShipmentsUseCase] insertion evaluation failed (non-fatal):', insertionErr?.message);
        }

        // ── ShipmentCreated → logistics outbox (append-only) ────────────────
        // Order service subscribes and records the shipment reference.
        try {
          await prisma.logistics_OutboxEvent?.create?.({
            data: {
              eventId: randomUUID(),
              eventType: 'shipment.created',
              eventData: {
                shipmentId: shipment.id,
                orderId: shipment.orderId,
                masterOrderId: request.masterOrderId,
                sellerId: shipment.sellerId,
                origin: {
                  lat: shipment.origin.getLatitude(),
                  lng: shipment.origin.getLongitude(),
                  address: shipment.origin.getAddress(),
                },
                destination: {
                  lat: shipment.destination.getLatitude(),
                  lng: shipment.destination.getLongitude(),
                  address: shipment.destination.getAddress(),
                },
                packageWeightKg: shipment.packageWeightKg,
                requiredVehicleClass: shipment.requiredVehicleClass,
                status: shipment.status,
                deliveryJobId: shipment.deliveryJobId,
                createdAt: shipment.createdAt.toISOString(),
              },
              status: 'PENDING',
            },
          });
          eventsEmitted += 1;
        } catch (eventErr: any) {
          // Non-fatal: outbox consumers can reconcile from the shipments table.
          console.error('[CreateOrderShipmentsUseCase] Failed to write shipment.created outbox event:', eventErr?.message);
        }
      } catch (err: any) {
        // Non-fatal per seller: one bad seller group must not block the others.
        console.error(`[CreateOrderShipmentsUseCase] Failed to create shipment for seller ${seller.sellerId}:`, err?.message);
      }
    }

    return { created: shipmentIds.length, shipmentIds, eventsEmitted };
  }
}
