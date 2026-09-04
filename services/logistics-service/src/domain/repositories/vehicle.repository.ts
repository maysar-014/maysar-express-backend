/**
 * VehicleRepository (Phase 2 §2.3)
 */

import { Vehicle } from '../entities/vehicle.entity';

export interface VehicleRepository {
  save(vehicle: Vehicle): Promise<void>;
  findById(id: string): Promise<Vehicle | null>;
  findByDriverId(driverId: string): Promise<Vehicle[]>;
  /** Active vehicles of a given type serving the listed area. */
  findActiveByTypeAndArea(vehicleType: string, area: string): Promise<Vehicle[]>;
}