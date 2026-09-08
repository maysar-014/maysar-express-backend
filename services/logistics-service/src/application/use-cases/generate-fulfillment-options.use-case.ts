/**
 * GenerateFulfillmentOptionsUseCase (Phase 4 §4.1)
 *
 * Given the buyer's shipments, destination, delivery-window preference, and
 * COD trust tier, generates RANKED fulfillment options.
 *
 * Flow: load active OptimizationConfig (or default weights) → load active
 * VehicleTariff → run the FulfillmentOptionEngine feasibility gates → rank
 * feasible options with the OptionRankingEngine → return ranked options +
 * exclusions (escalated, never silently dropped).
 */

import { FulfillmentOptionEngine, FulfillmentOptionRequest } from '../../domain/engines/fulfillment-option.engine';
import { OptionRankingEngine, RankedFulfillmentOption } from '../../domain/engines/option-ranking.engine';
import { FairnessEngine, FairnessViolation } from '../../domain/engines/fairness.engine';
import { VehicleTariff } from '../../domain/entities/vehicle-tariff.entity';
import { VehicleTariffRepository } from '../../domain/repositories/vehicle-tariff.repository';
import { FairnessFlagRepository } from '../../domain/repositories/fairness-flag.repository';
import { PrismaVehicleTariffRepository } from '../../infrastructure/repositories/prisma-vehicle-tariff.repository';
import { PrismaFairnessFlagRepository } from '../../infrastructure/repositories/prisma-fairness-flag.repository';
import { PrismaOptimizationConfigRepository } from '../../infrastructure/repositories/prisma-optimization-config.repository';
import { OptimizationConfig } from '../../domain/value-objects/optimization-config.value-object';
import { VehicleClass } from '../../domain/entities/shipment.entity';

import { BuyerProfileService } from '../services/buyer-profile.service';
import { PrismaBuyerProfileRepository } from '../../infrastructure/repositories/prisma-buyer-profile.repository';

export interface FulfillmentOptionsRequest {
  masterOrderId?: string;
  sessionId?: string;
  /** Buyer id — loads the behavior profile for failure-risk ranking (§6.3). */
  buyerId?: string;
  buyerDestination: { lat: number; lng: number; address: string };
  deliveryWindowPreference?: 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';
  shipments: Array<{
    shipmentId: string;
    sellerId: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    packageWeightKg: number;
    requiredVehicleClass?: VehicleClass | null;
    pickupEligible?: boolean;
  }>;
  buyerTrustTier?: 'NEW_BUYER' | 'TRUSTED_BUYER' | 'GOLD_BUYER';
}

export interface FulfillmentOptionsResult {
  masterOrderId?: string;
  options: RankedFulfillmentOption[];
  exclusions: Array<{ optionType: string; reason: string }>;
  /** Options removed by the FairnessEngine — escalated via FairnessFlags. */
  fairnessExcluded: Array<{
    optionType: string;
    fulfillmentPlanId: string;
    violations: FairnessViolation[];
  }>;
  weights: { version: number; buyerCostWeight: number; deliveryTimeWeight: number };
}

export class GenerateFulfillmentOptionsUseCase {
  private readonly engine = new FulfillmentOptionEngine();
  private readonly ranker = new OptionRankingEngine();
  private readonly fairnessEngine = new FairnessEngine();
  private readonly tariffRepo: VehicleTariffRepository = new PrismaVehicleTariffRepository();
  private readonly configRepo = new PrismaOptimizationConfigRepository();
  private readonly fairnessFlagRepo: FairnessFlagRepository = new PrismaFairnessFlagRepository();
  private readonly buyerProfiles = new BuyerProfileService(new PrismaBuyerProfileRepository());

  async execute(request: FulfillmentOptionsRequest): Promise<FulfillmentOptionsResult> {
    const config = (await this.configRepo.findActive())
      ?? OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() });
    const tariff: VehicleTariff | null = await this.tariffRepo.findLatestActive().catch(() => null);
    const buyerRisk = await this.buyerProfiles.getRiskProfile(request.buyerId).catch(() => ({ deliverySuccessRate: 0.8 }));

    if (!tariff) {
      // No active fleet tariff → only non-Maysar options (SUPPLIER_DELIVERY,
      // CUSTOMER_PICKUP) can be offered. Exclude Maysar options with reason.
      const { options, excluded } = this.engine.generate(this.buildRequest(request, null, config));
      const ranked = this.ranker.rank(options, config.weights, buyerRisk);
      const fairness = await this.applyFairness(ranked, config);
      return {
        masterOrderId: request.masterOrderId,
        options: fairness.options,
        exclusions: [
          ...excluded,
          { optionType: 'MAYSAR_EXPRESS', reason: 'No active vehicle tariff — Maysar-fulfilled options unavailable' },
          { optionType: 'MAYSAR_SHARED', reason: 'No active vehicle tariff — Maysar-fulfilled options unavailable' },
        ],
        fairnessExcluded: fairness.fairnessExcluded,
        weights: this.summaryWeights(config),
      };
    }

    const { options, excluded } = this.engine.generate(this.buildRequest(request, tariff, config));
    const ranked = this.ranker.rank(options, config.weights, buyerRisk);
    const fairness = await this.applyFairness(ranked, config);

    return {
      masterOrderId: request.masterOrderId,
      options: fairness.options,
      exclusions: excluded,
      fairnessExcluded: fairness.fairnessExcluded,
      weights: this.summaryWeights(config),
    };
  }

  /**
   * Fairness gate (Phase 6 §6.1): every ranked option is validated against
   * the four fairness checks before reaching the buyer. Failing options are
   * removed from the list AND each violation is persisted as a visible
   * Logistics_FairnessFlag — escalated to ops, never silently dropped.
   * Flag persistence is non-fatal: a broken DB must not crash the buyer flow.
   */
  private async applyFairness(
    ranked: RankedFulfillmentOption[],
    config: OptimizationConfig,
  ): Promise<Pick<FulfillmentOptionsResult, 'options' | 'fairnessExcluded'>> {
    const thresholds = config.fairness;
    const options: RankedFulfillmentOption[] = [];
    const fairnessExcluded: FulfillmentOptionsResult['fairnessExcluded'] = [];

    for (const option of ranked) {
      // Estimated driver active time: road time at the 30 km/h fallback
      // average plus a fixed 15-minute handling allowance (pickup + drop).
      const estimatedActiveHours = option.distanceKm / 30 + 0.25;
      const report = this.fairnessEngine.evaluate(
        {
          buyerPriceTzs: option.buyerPriceTzs,
          fulfillmentCostTzs: option.fulfillmentCostTzs,
          driverCompensationTzs: option.driverCompensationTzs,
          estimatedActiveHours,
          supplierAttributedChargesTzs: 0, // pre-delivery options carry no adjustments yet
          maysarMarginTzs: option.maysarMarginTzs,
        },
        thresholds,
      );

      if (report.passed) {
        options.push(option);
        continue;
      }

      fairnessExcluded.push({
        optionType: option.optionType,
        fulfillmentPlanId: option.fulfillmentPlanId,
        violations: report.violations,
      });
      for (const v of report.violations) {
        try {
          await this.fairnessFlagRepo.save({
            optionId: option.fulfillmentPlanId,
            checkType: v.checkType,
            computedValue: v.computedValue,
            threshold: v.threshold,
            detail: v.detail,
          });
        } catch (err: any) {
          console.error('[GenerateFulfillmentOptions] fairness flag persistence failed (non-fatal):', err?.message);
        }
      }
    }

    return { options, fairnessExcluded };
  }

  private buildRequest(
    request: FulfillmentOptionsRequest,
    tariff: VehicleTariff | null,
    config: OptimizationConfig,
  ): FulfillmentOptionRequest {
    if (!tariff) {
      // A £0 fallback tariff so the pure engine can still produce the
      // non-Maysar options. Values don't feed Maysar options (they're excluded).
      const fallback = VehicleTariff.create({
        vehicleId: 'VHL_NONE',
        baseOperatingCostTzs: 0,
        costPerKmTzs: 0,
        costPerHourTzs: 0,
        minimumJobCompensationTzs: 0,
      });
      return this.buildRequest(request, fallback, config);
    }
    return {
      shipments: request.shipments,
      buyer: request.buyerDestination,
      tariff,
      marginPct: 0.20,
      buyerTrustTier: request.buyerTrustTier ?? 'TRUSTED_BUYER',
      deliveryWindowPreference: request.deliveryWindowPreference,
      consolidationAvailable: true,
      availableVehicleTypes: ['MOTORCYCLE', 'PICKUP'] as VehicleClass[],
      availableVehicleCapacityKg: 30,
    };
  }

  private summaryWeights(config: OptimizationConfig) {
    return {
      version: config.version,
      buyerCostWeight: config.weights.buyerCostWeight,
      deliveryTimeWeight: config.weights.deliveryTimeWeight,
    };
  }
}