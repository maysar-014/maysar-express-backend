/**
 * VehicleTariff Entity (Phase 2 §2.3)
 *
 * A versioned operating tariff for a vehicle. **Never overwritten** — a new
 * version is created when rates change; historical orders reference the
 * version at time of pricing.
 */

export interface VehicleTariffData {
  id: string;
  vehicleId: string;
  version: number;
  baseOperatingCostTzs: number;
  costPerKmTzs: number;
  costPerHourTzs: number;
  minimumJobCompensationTzs: number;
  loadingFeeTzs: number;
  unloadingFeeTzs: number;
  waitingRateTzsPerMinute: number;
  freeWaitMinutes: number;
  isActive: boolean;
  effectiveFrom: Date;
  createdAt: Date;
}

export class VehicleTariff {
  private data: VehicleTariffData;

  constructor(data: VehicleTariffData) {
    if (!data.vehicleId) throw new Error('VehicleTariff invariant violation: vehicleId is required');
    if (!(data.version >= 1)) throw new Error('VehicleTariff invariant violation: version must be >= 1');
    if (data.baseOperatingCostTzs < 0 || data.costPerKmTzs < 0 || data.costPerHourTzs < 0) {
      throw new Error('VehicleTariff invariant violation: rates cannot be negative');
    }
    if (data.minimumJobCompensationTzs < 0) {
      throw new Error('VehicleTariff invariant violation: minimumJobCompensationTzs cannot be negative');
    }
    this.data = { ...data };
  }

  static create(params: {
    vehicleId: string;
    baseOperatingCostTzs: number;
    costPerKmTzs: number;
    costPerHourTzs: number;
    minimumJobCompensationTzs: number;
    loadingFeeTzs?: number;
    unloadingFeeTzs?: number;
    waitingRateTzsPerMinute?: number;
    freeWaitMinutes?: number;
    isActive?: boolean;
    effectiveFrom?: Date;
    id?: string;
    version?: number;
    createdAt?: Date;
    /** Next monotonic version for this vehicle (repo computes max+1). */
    nextVersion?: number;
  }): VehicleTariff {
    return new VehicleTariff({
      id: params.id ?? `vtf_${Math.random().toString(36).slice(2)}`,
      vehicleId: params.vehicleId,
      version: params.nextVersion ?? params.version ?? 1,
      baseOperatingCostTzs: params.baseOperatingCostTzs,
      costPerKmTzs: params.costPerKmTzs,
      costPerHourTzs: params.costPerHourTzs,
      minimumJobCompensationTzs: params.minimumJobCompensationTzs,
      loadingFeeTzs: params.loadingFeeTzs ?? 0,
      unloadingFeeTzs: params.unloadingFeeTzs ?? 0,
      waitingRateTzsPerMinute: params.waitingRateTzsPerMinute ?? 0,
      freeWaitMinutes: params.freeWaitMinutes ?? 0,
      isActive: params.isActive ?? true,
      effectiveFrom: params.effectiveFrom ?? new Date(),
      createdAt: params.createdAt ?? new Date(),
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get vehicleId(): string { return this.data.vehicleId; }
  get version(): number { return this.data.version; }
  get baseOperatingCostTzs(): number { return this.data.baseOperatingCostTzs; }
  get costPerKmTzs(): number { return this.data.costPerKmTzs; }
  get costPerHourTzs(): number { return this.data.costPerHourTzs; }
  get minimumJobCompensationTzs(): number { return this.data.minimumJobCompensationTzs; }
  get loadingFeeTzs(): number { return this.data.loadingFeeTzs; }
  get unloadingFeeTzs(): number { return this.data.unloadingFeeTzs; }
  get waitingRateTzsPerMinute(): number { return this.data.waitingRateTzsPerMinute; }
  get freeWaitMinutes(): number { return this.data.freeWaitMinutes; }
  get isActive(): boolean { return this.data.isActive; }
  get effectiveFrom(): Date { return this.data.effectiveFrom; }
  get createdAt(): Date { return this.data.createdAt; }

  toData(): VehicleTariffData {
    return { ...this.data };
  }
}