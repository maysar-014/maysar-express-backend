/**
 * DriverCompensationEngine (Phase 3 §3.1)
 *
 * Computes what the CARRIER receives — completely independent of the pricing
 * pipeline. Formula (backlog):
 *   base compensation + distance component + time component
 *   + load component (weight/volume factor) + waiting compensation
 *   + stop compensation (per additional stop beyond the first) + approved extras
 *
 * HARD CONSTRAINT: if totalCompensation < minimumJobCompensationTzs the job
 * must not be offered. The engine reports `meetsMinimumEarnings` and the
 * shortfall; `assertOfferable()` throws for callers that must enforce it.
 *
 * Pure and stateless: no async, no I/O, no side effects. Deterministic.
 */

export interface CompensationTariff {
  baseOperatingCostTzs: number;
  costPerKmTzs: number;
  costPerHourTzs: number;
  minimumJobCompensationTzs: number;
  waitingRateTzsPerMinute: number;
  freeWaitMinutes: number;
}

export interface ApprovedExtra {
  label: string;
  amountTzs: number;
}

export interface DriverCompensationInput {
  distanceKm: number;
  durationMinutes: number;
  tariff: CompensationTariff;
  load: { weightKg: number; volumeM3?: number | null };
  /** TZS per kg of the load factor (operator-configurable; 0 disables). */
  loadFactorRateTzsPerKg?: number;
  /** Total pickup stops on the route (>= 1). */
  stopCount?: number;
  /** TZS paid per additional stop beyond the first (0 disables). */
  stopCompensationTzs?: number;
  waitingMinutes?: number;
  approvedExtras?: ApprovedExtra[];
}

export interface DriverCompensationBreakdown {
  baseCompensationTzs: number;
  distanceComponentTzs: number;
  timeComponentTzs: number;
  loadComponentTzs: number;
  waitingCompensationTzs: number;
  stopCompensationTzs: number;
  approvedExtras: ApprovedExtra[];
  approvedExtrasTzs: number;
  totalCompensationTzs: number;
  minimumJobCompensationTzs: number;
  meetsMinimumEarnings: boolean;
  minimumShortfallTzs: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class DriverCompensationEngine {
  compute(input: DriverCompensationInput): DriverCompensationBreakdown {
    const { tariff } = input;
    if (!(input.distanceKm >= 0)) throw new Error('DriverCompensationEngine: distanceKm must be >= 0');
    if (!(input.durationMinutes >= 0)) throw new Error('DriverCompensationEngine: durationMinutes must be >= 0');
    if (tariff.baseOperatingCostTzs < 0 || tariff.costPerKmTzs < 0 || tariff.costPerHourTzs < 0) {
      throw new Error('DriverCompensationEngine: tariff rates cannot be negative');
    }
    if (tariff.minimumJobCompensationTzs < 0) {
      throw new Error('DriverCompensationEngine: minimumJobCompensationTzs cannot be negative');
    }
    if (input.load.weightKg < 0) throw new Error('DriverCompensationEngine: weightKg cannot be negative');

    const baseCompensationTzs = round2(tariff.baseOperatingCostTzs);
    const distanceComponentTzs = round2(input.distanceKm * tariff.costPerKmTzs);
    const timeComponentTzs = round2(input.durationMinutes * (tariff.costPerHourTzs / 60));

    // Load component: weight factor (+ volume factor when a rate is supplied).
    const loadRate = input.loadFactorRateTzsPerKg ?? 0;
    const loadComponentTzs = round2(input.load.weightKg * loadRate);

    // Waiting compensation mirrors the cost engine: chargeable beyond free wait.
    const actualWait = Math.max(0, input.waitingMinutes ?? 0);
    const chargeableWait = Math.max(0, actualWait - tariff.freeWaitMinutes);
    const waitingCompensationTzs = round2(chargeableWait * tariff.waitingRateTzsPerMinute);

    // Stop compensation: per additional stop beyond the first.
    const stopCount = Math.max(1, input.stopCount ?? 1);
    const stopRate = input.stopCompensationTzs ?? 0;
    const stopCompensationTzs = round2(Math.max(0, stopCount - 1) * stopRate);

    const approvedExtras = (input.approvedExtras ?? []).map(e => ({
      ...e,
      amountTzs: round2(e.amountTzs),
    }));
    const approvedExtrasTzs = round2(approvedExtras.reduce((sum, e) => sum + e.amountTzs, 0));

    const totalCompensationTzs = round2(
      baseCompensationTzs
      + distanceComponentTzs
      + timeComponentTzs
      + loadComponentTzs
      + waitingCompensationTzs
      + stopCompensationTzs
      + approvedExtrasTzs,
    );

    const minimumJobCompensationTzs = round2(tariff.minimumJobCompensationTzs);
    const meetsMinimumEarnings = totalCompensationTzs >= minimumJobCompensationTzs;
    const minimumShortfallTzs = meetsMinimumEarnings
      ? 0
      : round2(minimumJobCompensationTzs - totalCompensationTzs);

    return {
      baseCompensationTzs,
      distanceComponentTzs,
      timeComponentTzs,
      loadComponentTzs,
      waitingCompensationTzs,
      stopCompensationTzs,
      approvedExtras,
      approvedExtrasTzs,
      totalCompensationTzs,
      minimumJobCompensationTzs,
      meetsMinimumEarnings,
      minimumShortfallTzs,
    };
  }

  /**
   * Hard-constraint gate (backlog rule 3): throws when the compensation does
   * not meet the vehicle's minimum. The job must not be offered at a loss to
   * the driver — this cannot be overridden by the optimizer.
   */
  assertOfferable(breakdown: DriverCompensationBreakdown): void {
    if (!breakdown.meetsMinimumEarnings) {
      throw new Error(
        `DriverCompensationEngine: compensation ${breakdown.totalCompensationTzs} TZS is below the vehicle minimum `
        + `${breakdown.minimumJobCompensationTzs} TZS (shortfall ${breakdown.minimumShortfallTzs} TZS). `
        + `Job must be repriced, merged, or escalated to ops — never dispatched at a loss to the driver.`,
      );
    }
  }
}