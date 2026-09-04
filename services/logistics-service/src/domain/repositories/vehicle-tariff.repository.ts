/**
 * VehicleTariffRepository (Phase 2 §2.3)
 *
 * Tariffs are **append-only** — `save()` always creates a new row and computes
 * the next monotonic version for the vehicle. Old versions stay queryable so
 * historical orders can be reproduced exactly.
 */

import { VehicleTariff } from '../entities/vehicle-tariff.entity';

export interface VehicleTariffRepository {
  /** Always-creates a new versioned row (never overwrites an existing one). */
  save(tariff: VehicleTariff): Promise<void>;
  findById(id: string): Promise<VehicleTariff | null>;
  findVersion(vehicleId: string, version: number): Promise<VehicleTariff | null>;
  /** Most recent active tariff (optionally scoped to one vehicle). */
  findLatestActive(vehicleId?: string): Promise<VehicleTariff | null>;
  /** All versions for a vehicle, ascending — historical reproduction. */
  findVersionsForVehicle(vehicleId: string): Promise<VehicleTariff[]>;
}