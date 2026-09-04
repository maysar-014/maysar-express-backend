/**
 * DeliveryPricingEngine (v2)
 *
 * Redesigned from a single universal formula to a delivery-strategy-aware
 * cost model that reflects the actual economics of Tanzanian logistics.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 *   DELIVERY REQUEST
 *         │
 *         ▼
 *   Strategy Resolver  →  LOCAL_URBAN | METROPOLITAN | INTERCITY | REMOTE
 *         │
 *         ▼
 *   Fulfillment Cost Model  (strategy-specific)
 *         │
 *   ┌─────┴──────┐
 *   │            │
 *   LOCAL/METRO  INTERCITY/REMOTE
 *   Distance-    Corridor model:
 *   Band model   handling + line-haul
 *                + last-mile
 *         │
 *         ▼
 *   + Weight surcharge  (additive, not multiplicative)
 *   + Peak surcharge    (flat, optional)
 *         │
 *         ▼
 *   Fulfillment Cost
 *         │
 *   + Platform Margin  (% of fulfillment cost)
 *         │
 *   + COD charge       (independent flat charge if applicable)
 *         │
 *         ▼
 *   Floor / Ceiling / Rounding
 *         │
 *         ▼
 *   CUSTOMER DELIVERY FEE
 *
 * ─── Key design decisions ────────────────────────────────────────────────────
 *
 * 1. Distance bands replace (base + distance_rate × km + time_rate × min).
 *    The old model charged distance AND time independently, causing double
 *    charging for the same physical trip. Bands express the actual cost
 *    tier of an operation without compounding.
 *
 * 2. Weight is an ADDITIVE surcharge, not a multiplier of the entire cost.
 *    The old model multiplied everything by 1.2–2.0. An extra 4 kg should
 *    not multiply the base delivery fee — it adds incremental logistics cost.
 *
 * 3. Zone multipliers are REPLACED by delivery strategy classification.
 *    same_ward=1.0, same_district=1.1 etc. duplicated the distance signal.
 *    Now geography determines WHICH cost model applies.
 *
 * 4. Intercity uses a corridor model, not an urban courier formula.
 *    Dar → Arusha involves line-haul transport that has different economics
 *    from a motorcycle delivery in Dar es Salaam.
 *
 * 5. COD is a standalone charge, not a % of delivery distance economics.
 *    The cost of cash handling and failed-delivery risk is unrelated to km.
 *
 * 6. Margin is a % of fulfillment cost, not of the inflated pre-margin fee.
 *    This keeps the margin calculation transparent and economically honest.
 *
 * 7. Zero delivery fee = intentionally free delivery (never a fallback).
 *    Calculation failure is represented via DELIVERY_UNAVAILABLE.
 *
 * ─── Stateless / pure ────────────────────────────────────────────────────────
 * No I/O. No async. No side effects. Deterministic for identical inputs.
 */

import { PricingConfig } from '../value-objects/pricing-config.value-object';
import { DeliveryZone } from '../services/zone-classifier';
import { DeliveryStrategy, resolveDeliveryStrategy } from './delivery-strategy';
import { RouteSource } from './ports/routing-provider.port';

// ─── Input ───────────────────────────────────────────────────────────────────

export interface PricingInput {
  distanceKm: number;
  durationMinutes: number;
  packageWeightKg: number;
  packageDimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  deliveryZone: DeliveryZone;
  isCoD: boolean;
  isOperationalPeakHour: boolean;
  /** Pre-computed courier compensation for audit; NOT used to determine fee */
  courierCompensationEstimate: number;
  routeSource: RouteSource;
  /** Origin region name (used for corridor lookup in intercity) */
  originRegion?: string;
  /** Destination region name (used for corridor lookup in intercity) */
  destinationRegion?: string;
  /** Item value in TZS (for COD value-based surcharge if configured) */
  itemValueTzs?: number;
}

// ─── Output ──────────────────────────────────────────────────────────────────

export interface PricingBreakdown {
  // Strategy classification
  deliveryStrategy: DeliveryStrategy;

  // Fulfillment cost components
  distanceBandCost: number;       // base cost from distance band
  weightSurcharge: number;        // additive weight charge
  peakSurcharge: number;          // flat peak-hour charge
  originHandlingCost: number;     // intercity only: origin handling
  lineHaulCost: number;           // intercity only: line-haul transport
  destinationHandlingCost: number;// intercity only: destination handling
  lastMileCost: number;           // intercity only: last-mile delivery

  /**
   * Expected fulfillment cost — what the platform actually expects to spend
   * fulfilling this delivery (operational costs, not courier simulation).
   * This is the floor below which the customer price must not drop without
   * an explicit subsidy.
   *
   * NOTE: The CourierCostCalculator figures (stored in courierCompensationEstimate)
   * come from a simulation/placeholder engine with hardcoded mock data.
   * They represent a FUTURE aspirational target for courier pay, not current
   * operational cost. Until real courier contract data is integrated, the
   * fulfillmentCost (derived from calibrated distance bands / corridor configs)
   * is the authoritative cost basis. See assumption notes below.
   */
  fulfillmentCost: number;

  // Margin
  platformMarginPct: number;
  platformMarginAmount: number;

  // Sub-total before COD and floor/ceiling
  preAdjustmentFee: number;       // fulfillmentCost + margin

  // COD charge (independent)
  codCharge: number;

  // Floor / ceiling / rounding
  floorPrice: number;
  ceilingPrice: number;
  postClampFee: number;
  roundingIncrement: number;
  roundingAdjustment: number;

  // Final
  finalFee: number;

  /**
   * Financial integrity fields.
   *
   * platformSubsidy: The amount the platform absorbs when customerDeliveryFee
   * is intentionally below fulfillmentCost (e.g. free delivery promotions).
   * Zero in normal operation. If non-zero, must be recorded in audit and
   * represent an explicit business decision — not a silent loss.
   *
   * isProfitable: Whether this delivery generates positive margin for the platform.
   *
   * financialNote: Human-readable explanation of the financial position.
   */
  platformSubsidy: number;
  isProfitable: boolean;
  financialNote: string;

  // Metadata
  routeSource: RouteSource;
  pricingVersion: number;
  /**
   * Courier compensation estimate from CourierCostCalculator.
   * IMPORTANT: This figure is from a placeholder simulation engine with
   * hardcoded mock rates. It is stored for future reconciliation once real
   * courier contracts are integrated. It does NOT drive the customer price.
   * See assumption #1 in the calibration notes.
   */
  courierCompensationEstimate: number;
  platformMarginAmount_alias: number; // for backward compat with audit schema
}

export interface PricingResult {
  breakdown: PricingBreakdown;
  deliveryFee: number;
}

export interface DeliveryUnavailableResult {
  unavailable: true;
  reason: string;
  deliveryStrategy: DeliveryStrategy;
  pricingVersion: number;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class DeliveryPricingEngine {

  /**
   * Compute the customer-facing delivery fee.
   *
   * Returns either a PricingResult (successful pricing) or
   * DeliveryUnavailableResult (route cannot be served).
   */
  compute(
    input: PricingInput,
    config: PricingConfig,
  ): PricingResult | DeliveryUnavailableResult {

    const strategy = resolveDeliveryStrategy(input.deliveryZone, input.distanceKm);

    if (strategy === 'REMOTE' && config.remoteUnavailable) {
      return {
        unavailable: true,
        reason: 'Remote delivery is not currently available for this route.',
        deliveryStrategy: strategy,
        pricingVersion: config.version,
      };
    }

    if (strategy === 'LOCAL_URBAN' || strategy === 'METROPOLITAN') {
      return this.computeDistanceBandStrategy(input, config, strategy);
    }

    // INTERCITY or REMOTE (when not unavailable)
    return this.computeCorridorStrategy(input, config, strategy);
  }

  // ─── Local / Metropolitan: distance-band model ───────────────────────────

  private computeDistanceBandStrategy(
    input: PricingInput,
    config: PricingConfig,
    strategy: DeliveryStrategy,
  ): PricingResult {
    const strategyConfig = config.getStrategyConfig(strategy)!;

    // Fulfillment cost = distance band + weight surcharge + peak surcharge
    const distanceBandCost = config.getDistanceBandCost(strategyConfig, input.distanceKm);
    const weightSurcharge = config.getWeightSurcharge(strategyConfig, input.packageWeightKg);
    const peakSurcharge = input.isOperationalPeakHour
      ? strategyConfig.operationalSurcharge.peakHourSurchargeAmount
      : 0;

    const fulfillmentCost = distanceBandCost + weightSurcharge + peakSurcharge;

    return this.assembleResult(input, config, strategy, {
      distanceBandCost,
      weightSurcharge,
      peakSurcharge,
      originHandlingCost: 0,
      lineHaulCost: 0,
      destinationHandlingCost: 0,
      lastMileCost: 0,
      fulfillmentCost,
    });
  }

  // ─── Intercity / Remote: corridor model ─────────────────────────────────

  private computeCorridorStrategy(
    input: PricingInput,
    config: PricingConfig,
    strategy: DeliveryStrategy,
  ): PricingResult | DeliveryUnavailableResult {
    const originRegion = input.originRegion ?? '';
    const destinationRegion = input.destinationRegion ?? '';
    const corridor = config.findCorridor(originRegion, destinationRegion);

    if (!corridor) {
      return {
        unavailable: true,
        reason: `No delivery corridor is configured for ${originRegion} → ${destinationRegion}.`,
        deliveryStrategy: strategy,
        pricingVersion: config.version,
      };
    }

    // Corridor fulfillment cost:
    //   originHandling + lineHaulBase + (weightRate × kg) + destinationHandling + lastMile
    const originHandlingCost = corridor.originHandlingCostTzs;
    const lineHaulCost = corridor.lineHaulBaseCostTzs + (corridor.weightRateTzsPerKg * input.packageWeightKg);
    const destinationHandlingCost = corridor.destinationHandlingCostTzs;
    const lastMileCost = corridor.lastMileCostTzs;

    const fulfillmentCost = originHandlingCost + lineHaulCost + destinationHandlingCost + lastMileCost;

    return this.assembleResult(input, config, strategy, {
      distanceBandCost: 0,
      weightSurcharge: 0,
      peakSurcharge: 0,
      originHandlingCost,
      lineHaulCost,
      destinationHandlingCost,
      lastMileCost,
      fulfillmentCost,
    });
  }

  // ─── Common assembly ─────────────────────────────────────────────────────

  private assembleResult(
    input: PricingInput,
    config: PricingConfig,
    strategy: DeliveryStrategy,
    costs: {
      distanceBandCost: number;
      weightSurcharge: number;
      peakSurcharge: number;
      originHandlingCost: number;
      lineHaulCost: number;
      destinationHandlingCost: number;
      lastMileCost: number;
      fulfillmentCost: number;
    },
  ): PricingResult {

    // Platform margin on fulfillment cost
    const platformMarginAmount = Math.round(costs.fulfillmentCost * config.platformMarginPct);
    const preAdjustmentFee = costs.fulfillmentCost + platformMarginAmount;

    // COD: flat charge independent of delivery economics
    const codCharge = input.isCoD ? this.computeCodCharge(input, config) : 0;

    const preclampFee = preAdjustmentFee + codCharge;

    // Floor / ceiling
    let postClampFee = preclampFee;
    if (postClampFee < config.floorPriceTzs) postClampFee = config.floorPriceTzs;
    if (postClampFee > config.ceilingPriceTzs) postClampFee = config.ceilingPriceTzs;

    // Rounding (always up)
    const increment = config.roundingIncrementTzs;
    const finalFee = Math.ceil(postClampFee / increment) * increment;
    const roundingAdjustment = finalFee - postClampFee;

    // ── Financial integrity ────────────────────────────────────────────────
    // Determine whether the customer price covers the expected fulfillment cost.
    // A subsidy exists when finalFee < fulfillmentCost (e.g. free-delivery promo).
    // In normal operation, fulfillmentCost + margin + COD ≤ finalFee, so subsidy = 0.
    //
    // Note: The courierCompensationEstimate comes from a simulation/placeholder
    // engine (EarningsCalculationEngine) with hardcoded mock rates that do not
    // reflect real courier contracts. It is stored for future reconciliation but
    // is NOT used as the cost floor here. The fulfillmentCost from the strategy
    // configs is the authoritative cost basis until real courier data is integrated.
    const platformSubsidy = Math.max(0, costs.fulfillmentCost - finalFee);
    const isProfitable = finalFee >= costs.fulfillmentCost;

    let financialNote: string;
    if (platformSubsidy > 0) {
      financialNote = `SUBSIDIZED: Customer pays TZS ${finalFee}, fulfillment costs TZS ${costs.fulfillmentCost}. Platform absorbs TZS ${platformSubsidy} subsidy. This must be an explicit business decision.`;
    } else if (platformMarginAmount <= 0) {
      financialNote = `BREAK-EVEN: No margin on this delivery. Customer fee TZS ${finalFee} covers fulfillment cost TZS ${costs.fulfillmentCost} with zero profit.`;
    } else {
      financialNote = `PROFITABLE: Customer fee TZS ${finalFee} = fulfillment TZS ${costs.fulfillmentCost} + margin TZS ${platformMarginAmount}` +
        (codCharge > 0 ? ` + COD TZS ${codCharge}` : '') + '.';
    }

    const breakdown: PricingBreakdown = {
      deliveryStrategy: strategy,
      distanceBandCost: costs.distanceBandCost,
      weightSurcharge: costs.weightSurcharge,
      peakSurcharge: costs.peakSurcharge,
      originHandlingCost: costs.originHandlingCost,
      lineHaulCost: costs.lineHaulCost,
      destinationHandlingCost: costs.destinationHandlingCost,
      lastMileCost: costs.lastMileCost,
      fulfillmentCost: costs.fulfillmentCost,
      platformMarginPct: config.platformMarginPct,
      platformMarginAmount,
      preAdjustmentFee,
      codCharge,
      floorPrice: config.floorPriceTzs,
      ceilingPrice: config.ceilingPriceTzs,
      postClampFee,
      roundingIncrement: increment,
      roundingAdjustment,
      finalFee,
      platformSubsidy,
      isProfitable,
      financialNote,
      routeSource: input.routeSource,
      pricingVersion: config.version,
      courierCompensationEstimate: input.courierCompensationEstimate,
      platformMarginAmount_alias: platformMarginAmount,
    };

    return { breakdown, deliveryFee: finalFee };
  }

  private computeCodCharge(input: PricingInput, config: PricingConfig): number {
    const policy = config.codPolicy;
    let charge = policy.fixedChargeTzs;

    // Value-based surcharge for high-value COD orders
    if (
      policy.valueSurchargeRate > 0 &&
      input.itemValueTzs !== undefined &&
      input.itemValueTzs > policy.valueSurchargeThresholdTzs
    ) {
      const valueSurcharge = Math.round(input.itemValueTzs * policy.valueSurchargeRate);
      charge += valueSurcharge;
    }

    return charge;
  }
}

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isDeliveryUnavailable(
  result: PricingResult | DeliveryUnavailableResult,
): result is DeliveryUnavailableResult {
  return (result as DeliveryUnavailableResult).unavailable === true;
}
