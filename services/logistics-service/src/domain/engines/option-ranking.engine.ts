/**
 * OptionRankingEngine (Phase 4 §4.2)
 *
 * Scores feasible fulfillment options against a weighted objective function:
 *
 *   score = buyer_cost_weight        × normalized_cost_score
 *         + delivery_time_weight     × normalized_speed_score
 *         + utilization_weight       × vehicle_utilization_score
 *         + failure_risk_weight      × (1 − failure_probability_score)
 *         + driver_efficiency_weight × driver_economics_score
 *         + maysar_margin_weight     × margin_viability_score
 *
 * Only FEASIBLE options reach this engine — feasibility checks run first and
 * eliminate infeasible options before ranking (hierarchy rule 8). Returns
 * options sorted by score descending. Pure and stateless.
 */

import { FulfillmentOption, FulfillmentOptionType } from './fulfillment-option.engine';
import { OptimizationWeights } from '../value-objects/optimization-config.value-object';

/** Buyer behavior input (Phase 6 §6.3). New-buyer default success rate: 0.80. */
export interface BuyerRiskProfile {
  /** 0.0–1.0 historical delivery success rate for this buyer. */
  deliverySuccessRate: number;
}

export interface RankedFulfillmentOption extends FulfillmentOption {
  score: number;
  scoreComponents: {
    normalizedCostScore: number;
    normalizedSpeedScore: number;
    vehicleUtilizationScore: number;
    failureProbabilityScore: number;
    driverEconomicsScore: number;
    marginViabilityScore: number;
  };
}

export class OptionRankingEngine {
  /** New-buyer default per backlog §6.3. */
  private static readonly DEFAULT_BUYER_SUCCESS_RATE = 0.8;

  rank(
    options: FulfillmentOption[],
    weights: OptimizationWeights,
    buyerProfile?: BuyerRiskProfile,
  ): RankedFulfillmentOption[] {
    if (!options.length) return [];

    const prices = options.map(o => o.buyerPriceTzs);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceSpan = Math.max(1, maxPrice - minPrice);

    const etas = options.map(o => o.estimatedDeliveryAt.getTime());
    const minEta = Math.min(...etas);
    const maxEta = Math.max(...etas);
    const etaSpan = Math.max(1, maxEta - minEta);

    // Maysar-fulfilled options utilise shared capacity; pass-throughs don't.
    const utilizationFor = (t: FulfillmentOptionType): number => {
      switch (t) {
        case 'MAYSAR_SHARED':  return 1.0;
        case 'MAYSAR_EXPRESS': return 0.6;
        default:               return 0.0; // supplier carrier / pickup
      }
    };

    // Failure probability: less time-certain windows carry more risk, scaled
    // by the buyer's historical delivery success rate (Phase 6 §6.3). A buyer
    // with a 95% success rate gets lower estimated failure probabilities than
    // a new buyer (default 0.80) — the optimizer suggests more reliable
    // options to higher-risk buyers. Clamped so extreme histories saturate.
    const successRate = Math.min(
      1,
      Math.max(0.3, buyerProfile?.deliverySuccessRate ?? OptionRankingEngine.DEFAULT_BUYER_SUCCESS_RATE),
    );
    const buyerRiskFactor = OptionRankingEngine.DEFAULT_BUYER_SUCCESS_RATE / successRate;
    const failureProbabilityFor = (o: FulfillmentOption): number => {
      let base: number;
      if (o.optionType === 'MAYSAR_SHARED') base = 0.15;
      else if (o.optionType === 'MAYSAR_EXPRESS') base = 0.10;
      else if (o.optionType === 'SUPPLIER_DELIVERY') base = 0.20;
      else base = 0.05; // CUSTOMER_PICKUP
      return Math.min(1, base * buyerRiskFactor);
    };

    const maxCompensation = Math.max(1, ...options.map(o => o.driverCompensationTzs));

    const ranked: RankedFulfillmentOption[] = options.map(o => {
      const normalizedCostScore = 1 - (o.buyerPriceTzs - minPrice) / priceSpan;
      const normalizedSpeedScore = 1 - (o.estimatedDeliveryAt.getTime() - minEta) / etaSpan;
      const vehicleUtilizationScore = utilizationFor(o.optionType);
      const failureProbabilityScore = failureProbabilityFor(o);
      const driverEconomicsScore = o.driverCompensationTzs / maxCompensation;
      const marginViabilityScore = o.maysarMarginTzs > 0 ? 1 : 0;

      const score =
        weights.buyerCostWeight * normalizedCostScore
        + weights.deliveryTimeWeight * normalizedSpeedScore
        + weights.vehicleUtilizationWeight * vehicleUtilizationScore
        + weights.failureRiskWeight * (1 - failureProbabilityScore)
        + weights.driverEfficiencyWeight * driverEconomicsScore
        + weights.maysarMarginWeight * marginViabilityScore;

      return {
        ...o,
        score: Math.round(score * 10000) / 10000,
        scoreComponents: {
          normalizedCostScore: Math.round(normalizedCostScore * 10000) / 10000,
          normalizedSpeedScore: Math.round(normalizedSpeedScore * 10000) / 10000,
          vehicleUtilizationScore,
          failureProbabilityScore,
          driverEconomicsScore: Math.round(driverEconomicsScore * 10000) / 10000,
          marginViabilityScore,
        },
      };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }
}