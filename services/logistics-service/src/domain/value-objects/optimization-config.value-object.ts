/**
 * OptimizationConfig value object (Phase 4 §4.2)
 *
 * Versioned, operator-configurable ranking weights. **The six weights must
 * sum to exactly 1.0** (validated here) and every config change requires a
 * new version — no in-place overwrites.
 *
 * Also carries the Phase 3 §3.4 CostVariancePolicy fields (deferred from
 * Phase 3 because the backlog stores them in this config).
 */

export interface OptimizationWeights {
  buyerCostWeight: number;
  deliveryTimeWeight: number;
  vehicleUtilizationWeight: number;
  failureRiskWeight: number;
  driverEfficiencyWeight: number;
  maysarMarginWeight: number;
}

export interface CostVariancePolicy {
  /** Normal operational variance Maysar covers (TZS). */
  maysarAbsorbsUpToTzs: number;
  /** Variance types that may be charged to the customer, with policy coverage. */
  customerChargeableVarianceTypes: string[];
}

export interface FairnessThresholds {
  /** Max allowed buyerPrice / fulfillmentCost (e.g. 1.5). */
  maxBuyerPriceRatio: number;
  /** Minimum TZS per active hour the driver must earn. */
  minimumDriverHourlyRateTzs: number;
  /** Fleet utilization alert threshold (0–1). */
  minVehicleUtilizationTarget: number;
}

export interface OptimizationConfigData extends OptimizationWeights, CostVariancePolicy, FairnessThresholds {
  version: number;
  isActive: boolean;
}

const WEIGHT_KEYS: (keyof OptimizationWeights)[] = [
  'buyerCostWeight', 'deliveryTimeWeight', 'vehicleUtilizationWeight',
  'failureRiskWeight', 'driverEfficiencyWeight', 'maysarMarginWeight',
];

const SUM_TOLERANCE = 1e-6;

export class OptimizationConfig {
  private data: OptimizationConfigData;

  constructor(data: OptimizationConfigData) {
    for (const key of WEIGHT_KEYS) {
      const w = data[key];
      if (!(w >= 0 && w <= 1)) {
        throw new Error(`OptimizationConfig invariant violation: ${key} must be in [0, 1] (got ${w})`);
      }
    }
    const sum = WEIGHT_KEYS.reduce((s, k) => s + data[k], 0);
    if (Math.abs(sum - 1) > SUM_TOLERANCE) {
      throw new Error(
        `OptimizationConfig invariant violation: weights must sum to 1.0 (got ${sum.toFixed(6)})`,
      );
    }
    if (!(data.version >= 1)) throw new Error('OptimizationConfig invariant violation: version must be >= 1');
    if (data.maysarAbsorbsUpToTzs < 0) {
      throw new Error('OptimizationConfig invariant violation: maysarAbsorbsUpToTzs cannot be negative');
    }
    if (!(data.maxBuyerPriceRatio > 0)) {
      throw new Error('OptimizationConfig invariant violation: maxBuyerPriceRatio must be > 0');
    }
    if (!(data.minimumDriverHourlyRateTzs > 0)) {
      throw new Error('OptimizationConfig invariant violation: minimumDriverHourlyRateTzs must be > 0');
    }
    if (!(data.minVehicleUtilizationTarget >= 0 && data.minVehicleUtilizationTarget <= 1)) {
      throw new Error('OptimizationConfig invariant violation: minVehicleUtilizationTarget must be in [0, 1]');
    }
    this.data = { ...data };
  }

  static create(params: {
    version?: number;
    weights: OptimizationWeights;
    variancePolicy?: Partial<CostVariancePolicy>;
    fairness?: Partial<FairnessThresholds>;
    isActive?: boolean;
  }): OptimizationConfig {
    return new OptimizationConfig({
      version: params.version ?? 1,
      ...params.weights,
      maysarAbsorbsUpToTzs: params.variancePolicy?.maysarAbsorbsUpToTzs ?? 0,
      customerChargeableVarianceTypes: params.variancePolicy?.customerChargeableVarianceTypes ?? [],
      maxBuyerPriceRatio: params.fairness?.maxBuyerPriceRatio ?? 1.5,
      minimumDriverHourlyRateTzs: params.fairness?.minimumDriverHourlyRateTzs ?? 3000,
      minVehicleUtilizationTarget: params.fairness?.minVehicleUtilizationTarget ?? 0.5,
      isActive: params.isActive ?? true,
    });
  }

  /** Default balanced weights (used until operators configure their own). */
  static defaultWeights(): OptimizationWeights {
    // Fixed hierarchy emphasis: buyer economics first, then time,
    // then utilization, reliability, driver economics, margin.
    return {
      buyerCostWeight: 0.35,
      deliveryTimeWeight: 0.25,
      vehicleUtilizationWeight: 0.15,
      failureRiskWeight: 0.10,
      driverEfficiencyWeight: 0.10,
      maysarMarginWeight: 0.05,
    };
  }

  get version(): number { return this.data.version; }
  get isActive(): boolean { return this.data.isActive; }
  get weights(): OptimizationWeights {
    const { buyerCostWeight, deliveryTimeWeight, vehicleUtilizationWeight, failureRiskWeight, driverEfficiencyWeight, maysarMarginWeight } = this.data;
    return { buyerCostWeight, deliveryTimeWeight, vehicleUtilizationWeight, failureRiskWeight, driverEfficiencyWeight, maysarMarginWeight };
  }
  get variancePolicy(): CostVariancePolicy {
    return {
      maysarAbsorbsUpToTzs: this.data.maysarAbsorbsUpToTzs,
      customerChargeableVarianceTypes: [...this.data.customerChargeableVarianceTypes],
    };
  }
  get fairness(): FairnessThresholds {
    return {
      maxBuyerPriceRatio: this.data.maxBuyerPriceRatio,
      minimumDriverHourlyRateTzs: this.data.minimumDriverHourlyRateTzs,
      minVehicleUtilizationTarget: this.data.minVehicleUtilizationTarget,
    };
  }

  toData(): OptimizationConfigData {
    return { ...this.data };
  }
}