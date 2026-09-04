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
}

export interface CreateOrderShipmentsResult {
  created: number;
  shipmentIds: string[];
  eventsEmitted: number;
}

// Dar es Salaam city-centre fallback (same convention as GetDeliveryOptionsUseCase)
const FALLBACK_BUYER = { lat: -6.7924, lng: 39.2083, address: 'Dar es Salaam, Tanzania' };

export class CreateOrderShipmentsUseCase {
  private readonly shipmentRepo = new PrismaShipmentRepository();

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
        });
        await this.shipmentRepo.save(shipment);
        shipmentIds.push(shipment.id);

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
