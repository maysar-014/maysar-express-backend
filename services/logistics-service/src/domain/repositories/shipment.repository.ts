/**
 * ShipmentRepository (Phase 2 §2.1)
 *
 * Persistence contract for the Shipment aggregate. Implementations live in
 * infrastructure (PrismaShipmentRepository).
 */

import { Shipment } from '../entities/shipment.entity';

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment[]>;
  /** Resolve a shipment by its own tracking number (TRK-NLNLNL). */
  findByTrackingNumber(trackingNumber: string): Promise<Shipment | null>;
  findByDeliveryJobId(deliveryJobId: string): Promise<Shipment[]>;
  /** Shipments not yet assigned to a DeliveryJob (the opportunity pool). */
  findUnassigned(): Promise<Shipment[]>;
  updateStatus(id: string, status: string, failureReason?: string): Promise<void>;
}
