/**
 * CourierCostCalculator
 *
 * Computes a courier compensation estimate for audit and future reconciliation.
 *
 * ⚠️  IMPORTANT — SIMULATION STATUS:
 * The rates in this class were copied from EarningsCalculationEngine, which is
 * a placeholder/simulation engine with hardcoded mock data. These rates do NOT
 * represent actual courier contracts or current operational costs in Tanzania.
 *
 * The rates imply:
 *   - Base: 2,000 TZS per delivery
 *   - Distance: 500 TZS/km
 *   - Time: 200 TZS/min
 *   → 8 km / 25 min delivery = TZS 11,000 estimated courier cost
 *
 * This is significantly higher than actual Dar es Salaam boda-boda rates
 * (typically TZS 1,500–3,500 per local trip). The estimate should be treated
 * as an upper-bound target for courier compensation (i.e. what the platform
 * aspires to pay once it has sufficient scale), NOT as current operational cost.
 *
 * The customer pricing engine (DeliveryPricingEngine) uses calibrated
 * distance bands as the authoritative cost basis — NOT these simulated rates.
 * This estimate is stored in the audit record for future reconciliation once
 * real courier contract data is available.
 *
 * TODO: Replace these hardcoded rates with actual courier contract data once
 * the platform has processed enough deliveries to establish real benchmarks.
 * Integrate with EarningsCalculationEngine once it uses real DB data.
 *
 * Phase 2 §2.3: the active VehicleTariff (versioned, from the DB) now drives
 * the estimate when provided; the constants below remain as a documented
 * fallback until the tariff migration is fully wired into every call site.
 */

export interface CourierCostEstimate {
  /** Fixed base per delivery (TZS) */
  baseRate: number;
  /** Distance component: distanceKm × DISTANCE_RATE */
  distanceCost: number;
  /** Time component: durationMinutes × TIME_RATE */
  timeCost: number;
  /** Total expected courier compensation for this delivery */
  totalCompensation: number;
}

/** Rates read from an active VehicleTariff (Phase 2 §2.3). */
export interface VehicleTariffRates {
  baseOperatingCostTzs: number;
  costPerKmTzs: number;
  costPerHourTzs: number;
}

export class CourierCostCalculator {
  // SYNC-WITH: VehicleTariff.baseOperatingCostTzs
  private static readonly BASE_RATE = 2000; // TZS per delivery

  // SYNC-WITH: VehicleTariff.costPerKmTzs
  private static readonly DISTANCE_RATE = 500; // TZS per km

  // SYNC-WITH: VehicleTariff.costPerHourTzs (converted to per-minute)
  private static readonly TIME_RATE = 200; // TZS per minute

  /**
   * Estimate the courier compensation for a delivery of the given distance and duration.
   * This is used as the cost basis for the pricing margin calculation.
   *
   * @param distanceKm    Road distance in kilometres
   * @param durationMinutes Estimated delivery duration in minutes
   * @param tariff        Active VehicleTariff rates — when provided these take
   *                      precedence over the §SYNC-WITH fallback constants.
   */
  estimate(distanceKm: number, durationMinutes: number, tariff?: VehicleTariffRates): CourierCostEstimate {
    const baseRate = tariff ? tariff.baseOperatingCostTzs : CourierCostCalculator.BASE_RATE;
    const distanceRate = tariff ? tariff.costPerKmTzs : CourierCostCalculator.DISTANCE_RATE;
    // costPerHourTzs is per hour — convert to per-minute for the estimate.
    const timeRate = tariff ? tariff.costPerHourTzs / 60 : CourierCostCalculator.TIME_RATE;

    const distanceCost = distanceKm * distanceRate;
    const timeCost = durationMinutes * timeRate;

    return {
      baseRate,
      distanceCost,
      timeCost,
      totalCompensation: baseRate + distanceCost + timeCost,
    };
  }

  /** Expose rates for audit/reporting purposes (read-only). */
  static getRates(tariff?: VehicleTariffRates): { baseRate: number; distanceRate: number; timeRate: number } {
    return {
      baseRate: tariff ? tariff.baseOperatingCostTzs : CourierCostCalculator.BASE_RATE,
      distanceRate: tariff ? tariff.costPerKmTzs : CourierCostCalculator.DISTANCE_RATE,
      timeRate: tariff ? tariff.costPerHourTzs / 60 : CourierCostCalculator.TIME_RATE,
    };
  }
}
