/**
 * Vehicle Entity (Phase 2 §2.3)
 *
 * A physical vehicle a driver operates. The optimizer reads real capability
 * constraints from here — the motorcycle-assumes-all model is retired.
 */

import { makeId } from '../../../../../shared/ids/id';

export type VehicleType = 'MOTORCYCLE' | 'PICKUP' | 'VAN' | 'TRUCK';

export interface CargoDimensions {
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
}

export interface OperatingHour {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startHour: number; // 0–23
  endHour: number;   // 0–24 (24 allowed for end-of-day)
}

export interface VehicleData {
  id: string;
  driverId: string;
  vehicleType: VehicleType;
  maxWeightKg: number;
  maxVolumeM3: number | null;
  cargoDimensions: CargoDimensions | null;
  servesAreas: string[];
  operatingHours: OperatingHour[];
  hasRefrigeration: boolean;
  handlesFragile: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VEHICLE_TYPES: VehicleType[] = ['MOTORCYCLE', 'PICKUP', 'VAN', 'TRUCK'];

export function makeVehicleId(): string {
  return makeId('VHL');
}

export class Vehicle {
  private data: VehicleData;

  constructor(data: VehicleData) {
    if (!data.driverId) throw new Error('Vehicle invariant violation: driverId is required');
    if (!VEHICLE_TYPES.includes(data.vehicleType)) {
      throw new Error(`Vehicle invariant violation: unknown vehicleType '${data.vehicleType}'`);
    }
    if (!(data.maxWeightKg > 0)) {
      throw new Error(`Vehicle invariant violation: maxWeightKg must be > 0 (got ${data.maxWeightKg})`);
    }
    if (data.maxVolumeM3 !== null && data.maxVolumeM3 <= 0) {
      throw new Error('Vehicle invariant violation: maxVolumeM3 must be > 0 when set');
    }
    for (const h of data.operatingHours) {
      if (h.dayOfWeek < 0 || h.dayOfWeek > 6) throw new Error('Vehicle invariant violation: dayOfWeek must be 0–6');
      if (h.startHour < 0 || h.endHour > 24 || h.startHour > h.endHour) {
        throw new Error('Vehicle invariant violation: invalid operating hours window');
      }
    }
    this.data = { ...data };
  }

  static create(params: Omit<VehicleData, 'id' | 'createdAt' | 'updatedAt'>): Vehicle {
    return new Vehicle({
      ...params,
      id: makeVehicleId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get driverId(): string { return this.data.driverId; }
  get vehicleType(): VehicleType { return this.data.vehicleType; }
  get maxWeightKg(): number { return this.data.maxWeightKg; }
  get maxVolumeM3(): number | null { return this.data.maxVolumeM3; }
  get cargoDimensions(): CargoDimensions | null { return this.data.cargoDimensions ? { ...this.data.cargoDimensions } : null; }
  get servesAreas(): string[] { return [...this.data.servesAreas]; }
  get operatingHours(): OperatingHour[] { return this.data.operatingHours.map(h => ({ ...h })); }
  get hasRefrigeration(): boolean { return this.data.hasRefrigeration; }
  get handlesFragile(): boolean { return this.data.handlesFragile; }
  get isActive(): boolean { return this.data.isActive; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }

  toData(): VehicleData {
    return { ...this.data };
  }
}