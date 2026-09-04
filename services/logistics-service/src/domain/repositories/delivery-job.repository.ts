/**
 * DeliveryJobRepository (Phase 2 §2.2)
 */

import { DeliveryJob } from '../entities/delivery-job.entity';

export interface DeliveryJobRepository {
  save(job: DeliveryJob): Promise<void>;
  findById(id: string): Promise<DeliveryJob | null>;
  findByDriverId(driverId: string): Promise<DeliveryJob[]>;
  findByShipmentId(shipmentId: string): Promise<DeliveryJob | null>;
  /** Jobs actively being worked (driver assigned, not yet delivered). */
  findActive(): Promise<DeliveryJob[]>;
  updateStatus(id: string, status: string, failureReason?: string): Promise<void>;
}
