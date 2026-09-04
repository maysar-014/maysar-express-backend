/**
 * FulfillmentCostEngine (Phase 3 §3.1)
 *
 * Computes the ACTUAL COST of performing a delivery — the raw economic cost
 * of the operation. This is not a buyer price and not a driver compensation;
 * those are computed by the BuyerPriceEngine and DriverCompensationEngine
 * respectively.
 *
 * Components (backlog formula):
 *   fixed base + distance cost + time cost + loading fee + unloading fee
 *   + waiting cost (max(0, actualWait − freeWaitMinutes) × waitingRateTzsPerMinute)
 *   + additional charges (tolls, parking, access — structured line items)
 *
 * Pure and stateless: no async, no I/O, no side effects. Deterministic.
 */

import { VehicleClass } from '../entities/shipment.entity';

export interface AdditionalCharge {
  label: string;
  amountTzs: number;
  category: 'TOLL' | 'PARKING' | 'ACCESS' | 'OTHER';
}

export interface CostHandlingRequirements {
  fragile: boolean;
  temperatureControlled: boolean;
  hazmat: boolean;
}

export interface FulfillmentCostTariff {
  baseOperatingCostTzs: number;
  costPerKmTzs: number;
  costPerHourTzs: number;
  loadingFeeTzs: number;
  unloadingFeeTzs: number;
  waitingRateTzsPerMinute: number;
  freeWaitMinutes: number;
}

export interface FulfillmentCostInput {
  distanceKm: number;
  durationMinutes: number;
  tariff: FulfillmentCostTariff;
  /** Vehicle class the job would be served with (traceability / future use). */
  vehicleClass?: VehicleClass | null;
  handlingRequirements?: CostHandlingRequirements;
  /** Actual minutes the courier had to wait (e.g. supplier not ready). */
  waitingMinutes?: number;
  additionalCharges?: AdditionalCharge[];
}

export interface FulfillmentCostBreakdown {
  baseCostTzs: number;
  distanceCostTzs: number;
  timeCostTzs: number;
  loadingFeeTzs: number;
  unloadingFeeTzs: number;
  waitingCostTzs: number;
  additionalCharges: AdditionalCharge[];
  additionalChargesTzs: number;
  handlingRequirements: CostHandlingRequirements;
  vehicleClass: VehicleClass | null;
  totalFulfillmentCostTzs: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class FulfillmentCostEngine {
  compute(input: FulfillmentCostInput): FulfillmentCostBreakdown {
    const { tariff } = input;
    if (!(input.distanceKm >= 0)) throw new Error('FulfillmentCostEngine: distanceKm must be >= 0');
    if (!(input.durationMinutes >= 0)) throw new Error('FulfillmentCostEngine: durationMinutes must be >= 0');
    if (tariff.baseOperatingCostTzs < 0 || tariff.costPerKmTzs < 0 || tariff.costPerHourTzs < 0) {
      throw new Error('FulfillmentCostEngine: tariff rates cannot be negative');
    }

    const baseCostTzs = round2(tariff.baseOperatingCostTzs);
    const distanceCostTzs = round2(input.distanceKm * tariff.costPerKmTzs);
    const timeCostTzs = round2(input.durationMinutes * (tariff.costPerHourTzs / 60));
    const loadingFeeTzs = round2(tariff.loadingFeeTzs);
    const unloadingFeeTzs = round2(tariff.unloadingFeeTzs);

    // Waiting: charge only beyond the free wait period.
    const actualWait = Math.max(0, input.waitingMinutes ?? 0);
    const chargeableWait = Math.max(0, actualWait - tariff.freeWaitMinutes);
    const waitingCostTzs = round2(chargeableWait * tariff.waitingRateTzsPerMinute);

    const additionalCharges = (input.additionalCharges ?? []).map(c => ({
      ...c,
      amountTzs: round2(c.amountTzs),
    }));
    const additionalChargesTzs = round2(additionalCharges.reduce((sum, c) => sum + c.amountTzs, 0));

    const handlingRequirements: CostHandlingRequirements = {
      fragile: input.handlingRequirements?.fragile ?? false,
      temperatureControlled: input.handlingRequirements?.temperatureControlled ?? false,
      hazmat: input.handlingRequirements?.hazmat ?? false,
    };

    const totalFulfillmentCostTzs = round2(
      baseCostTzs
      + distanceCostTzs
      + timeCostTzs
      + loadingFeeTzs
      + unloadingFeeTzs
      + waitingCostTzs
      + additionalChargesTzs,
    );

    return {
      baseCostTzs,
      distanceCostTzs,
      timeCostTzs,
      loadingFeeTzs,
      unloadingFeeTzs,
      waitingCostTzs,
      additionalCharges,
      additionalChargesTzs,
      handlingRequirements,
      vehicleClass: input.vehicleClass ?? null,
      totalFulfillmentCostTzs,
    };
  }
}