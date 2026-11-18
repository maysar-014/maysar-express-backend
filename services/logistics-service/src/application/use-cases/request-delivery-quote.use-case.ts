/**
 * RequestDeliveryQuoteUseCase (v2)
 *
 * Orchestrates the delivery quote flow using the redesigned strategy-aware engine:
 *  1. Load active PricingConfig
 *  2. Build GeoPoints
 *  3. Classify zone (extracts region names for corridor lookup)
 *  4. If zone unavailable → return DELIVERY_UNAVAILABLE quote
 *  5. Get route (distance + duration)
 *  6. Estimate courier cost (for audit only — not used in customer fee calculation)
 *  7. Resolve delivery strategy from zone + distance
 *  8. Compute pricing through strategy-aware engine
 *  9. If engine returns DELIVERY_UNAVAILABLE → return that quote
 * 10. Build Quote entity (ACTIVE)
 * 11. Persist quote + audit record
 * 12. Return response
 */

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { ZoneClassifier, DeliveryZone } from '../../domain/services/zone-classifier';
import { RoutingProviderPort, RoutingResult } from '../../domain/engines/ports/routing-provider.port';
import { CourierCostCalculator, VehicleTariffRates } from '../../domain/engines/courier-cost-calculator';
import { DeliveryPricingEngine, PricingInput, isDeliveryUnavailable } from '../../domain/engines/delivery-pricing.engine';
import { QuoteRepository } from '../../domain/repositories/quote.repository';
import { PricingConfigRepository } from '../../domain/repositories/pricing-config.repository';
import { PricingAuditRecordRepository } from '../../domain/repositories/pricing-audit-record.repository';
import { VehicleTariffRepository } from '../../domain/repositories/vehicle-tariff.repository';
import { MerchantDeliveryPolicyRepository } from '../../domain/repositories/merchant-delivery-policy.repository';
import { AuthorizedSubsidyRepository } from '../../domain/repositories/authorized-subsidy.repository';
import { FulfillmentCostEngine } from '../../domain/engines/fulfillment-cost.engine';
import { DriverCompensationEngine } from '../../domain/engines/driver-compensation.engine';
import { BuyerPriceEngine } from '../../domain/engines/buyer-price.engine';
import { FinancialFeasibilityEngine } from '../../domain/engines/financial-feasibility.engine';
import { MerchantContributionEngine } from '../../domain/engines/merchant-contribution.engine';
import { SubsidyGovernanceEngine } from '../../domain/engines/subsidy-governance.engine';
import { ThreeEngineQuoteBreakdown } from '../../domain/engines/three-engine-breakdown';
import { VehicleTariff } from '../../domain/entities/vehicle-tariff.entity';
import { Quote, QuoteData, QuoteResponse } from '../../domain/entities/quote.entity';
import { PricingAuditRecord, PricingAuditRecordData } from '../../domain/entities/pricing-audit-record.entity';
import { makeId } from '../../../../../shared/ids/id';

export interface DeliveryQuoteRequest {
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  packageWeightKg: number;
  packageDimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  isCoD?: boolean;
  /** Item value in TZS — used for COD value-based surcharge if configured */
  itemValueTzs?: number;
  requestedAt?: Date;
  /**
   * Seller ID — used to look up the merchant's delivery contribution policy
   * (MYS-DEL-001 Article 4.4). Optional; when absent no merchant contribution
   * is applied and the feasibility engine uses null for that funding source.
   */
  sellerId?: string;
  /**
   * Multi-pickup: additional pickup points after the primary origin.
   * When present, route = origin → additionalPickupPoints[0] → ... → destination.
   * Zone is still classified from origin → destination (first seller → buyer).
   */
  additionalPickupPoints?: Array<{ lat: number; lng: number; address: string }>;
  /** Delivery group ID to associate with this quote (multi-seller consolidation) */
  deliveryGroupId?: string;
  /** Seller order IDs in this delivery group */
  sellerOrderIds?: string[];
}

export class RequestDeliveryQuoteUseCase {
  // Phase 3 §3.1: the three-engine pipeline (cost → compensation → buyer price).
  private readonly fulfillmentCostEngine = new FulfillmentCostEngine();
  private readonly driverCompensationEngine = new DriverCompensationEngine();
  private readonly buyerPriceEngine = new BuyerPriceEngine();
  // MYS-DEL-001 Article 4.6: financial feasibility gate.
  private readonly financialFeasibilityEngine = new FinancialFeasibilityEngine();
  // MYS-DEL-001 Article 4.4: merchant contribution.
  private readonly merchantContributionEngine = new MerchantContributionEngine();
  // MYS-DEL-001 Article 4.5: subsidy governance.
  private readonly subsidyGovernanceEngine = new SubsidyGovernanceEngine();

  constructor(
    private readonly pricingEngine: DeliveryPricingEngine,
    private readonly courierCostCalc: CourierCostCalculator,
    private readonly zoneClassifier: ZoneClassifier,
    private readonly routingProvider: RoutingProviderPort,
    private readonly quoteRepo: QuoteRepository,
    private readonly pricingConfigRepo: PricingConfigRepository,
    private readonly auditRepo: PricingAuditRecordRepository,
    private readonly vehicleTariffRepo?: VehicleTariffRepository,
    private readonly merchantPolicyRepo?: MerchantDeliveryPolicyRepository,
    private readonly subsidyRepo?: AuthorizedSubsidyRepository,
  ) {}

  async execute(request: DeliveryQuoteRequest): Promise<QuoteResponse> {
    const now = request.requestedAt ?? new Date();

    // 1. Load active PricingConfig
    const config = await this.pricingConfigRepo.getActive();

    // 2. Build GeoPoints
    const origin = GeoPoint.create(request.originLat, request.originLng, request.originAddress);
    const destination = GeoPoint.create(request.destinationLat, request.destinationLng, request.destinationAddress);

    // 3. Classify zone — also extracts region names for corridor lookup
    const zoneResult = this.zoneClassifier.classify(origin, destination);

    const quoteId = makeId('qte');
    const expiresAt = new Date(now.getTime() + config.quoteValiditySeconds * 1000);

    // 4. Zone unavailable
    if (zoneResult.unavailable) {
      const unavailableQuoteData: QuoteData = {
        quoteId,
        deliveryFee: 0,
        courierCompensationEstimate: 0,
        platformMarginAmount: 0,
        pricingVersion: config.version,
        originLat: request.originLat,
        originLng: request.originLng,
        originAddress: request.originAddress,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        destinationAddress: request.destinationAddress,
        packageWeightKg: request.packageWeightKg,
        deliveryZone: null,
        status: 'DELIVERY_UNAVAILABLE',
        issuedAt: now,
        expiresAt,
        breakdown: null,
        unavailableReason: zoneResult.reason,
      };
      const unavailableQuote = new Quote(unavailableQuoteData);
      await this.quoteRepo.save(unavailableQuote);
      return unavailableQuote.toResponse();
    }

    const deliveryZone = zoneResult.zone as DeliveryZone;

    // 5. Get route (single-origin or multi-pickup)
    let routeResult: RoutingResult;
    if (request.additionalPickupPoints && request.additionalPickupPoints.length > 0) {
      const allPickupPoints = [origin, ...request.additionalPickupPoints.map(p =>
        GeoPoint.create(p.lat, p.lng, p.address),
      )];
      try {
        const bridge = this.routingProvider as any;
        if (typeof bridge.calculateMultiStopRoute === 'function') {
          const multiRoute = await bridge.calculateMultiStopRoute([...allPickupPoints, destination]);
          routeResult = { distanceKm: multiRoute.totalDistance, durationMinutes: multiRoute.totalDuration, source: 'live' as const };
        } else {
          routeResult = await this.routingProvider.getRoute(origin, destination);
        }
      } catch {
        let totalDist = 0;
        const pts = [...allPickupPoints, destination];
        for (let i = 0; i < pts.length - 1; i++) totalDist += pts[i].distanceTo(pts[i + 1]) * 1.35;
        routeResult = { distanceKm: totalDist, durationMinutes: Math.round((totalDist / 28) * 60), source: 'fallback' as const };
      }
    } else {
      routeResult = await this.routingProvider.getRoute(origin, destination);
    }

    // 6. Estimate courier cost (for audit purposes — NOT used in customer fee)
    // Phase 2 §2.3: prefer the active VehicleTariff rates when available;
    // fall back to the calculator's documented constants otherwise.
    // Phase 3 §3.1: the full active tariff also drives the three-engine path.
    let activeTariff: VehicleTariff | null = null;
    try {
      activeTariff = (await this.vehicleTariffRepo?.findLatestActive()) ?? null;
    } catch {
      // Non-fatal — audit estimate only.
    }
    const tariffRates: VehicleTariffRates | undefined = activeTariff
      ? {
          baseOperatingCostTzs: activeTariff.baseOperatingCostTzs,
          costPerKmTzs: activeTariff.costPerKmTzs,
          costPerHourTzs: activeTariff.costPerHourTzs,
        }
      : undefined;
    const courierCost = this.courierCostCalc.estimate(routeResult.distanceKm, routeResult.durationMinutes, tariffRates);

    // 6b. MYS-DEL-001 Article 4.4 — look up the seller's merchant delivery
    // contribution policy so the feasibility engine can include EXPECTED
    // contributions in the breakdown (they will be EXPECTED, not CONFIRMED,
    // at quote time — only the settlement layer confirms collection).
    let merchantContributionResult: import('../../domain/engines/merchant-contribution.engine').MerchantContributionResult | null = null;
    if (request.sellerId && this.merchantPolicyRepo) {
      try {
        const policy = await this.merchantPolicyRepo.findByMerchantId(request.sellerId);
        if (policy) {
          merchantContributionResult = this.merchantContributionEngine.compute({
            policy,
            customerDeliveryFeeTzs: undefined, // buyer price not yet computed at this stage
          });
        }
      } catch {
        // Non-fatal — treat as no merchant contribution.
      }
    }

    // 6c. MYS-DEL-001 Article 4.5 — look up the first applicable active subsidy
    // for this route. Subsidies are matched by zone and strategy; global subsidies
    // (null zone/strategy) match any route. The SubsidyGovernanceEngine validates
    // expiry and authorization at compute time — it never blindly applies them.
    let subsidyAuthorization: import('../../domain/engines/subsidy-governance.engine').AuthorizedSubsidy | null = null;
    if (this.subsidyRepo) {
      try {
        const zone = zoneResult.unavailable ? null : (zoneResult.zone as string);
        const candidates = await this.subsidyRepo.findActive({ deliveryZone: zone, asOf: now });
        // Pick the first valid non-expired subsidy; the engine re-validates it at compute time.
        subsidyAuthorization = candidates[0] ?? null;
      } catch {
        // Non-fatal — treat as no subsidy.
      }
    }

    // 6a. Phase 3 §3.1 — three-engine pipeline (cost → compensation → buyer
    // price) as the PRIMARY path whenever an active VehicleTariff exists.
    // Falls back to the interim 11-stage pipeline (below) when no tariff is
    // active or the three-engine path fails for any reason.
    const threeEngineResponse = this.tryThreeEnginePath(
      { activeTariff, routeResult, request, config, now, quoteId, expiresAt, deliveryZone, merchantContributionResult, subsidyAuthorization },
    );
    if (threeEngineResponse) {
      await this.persistQuoteAndAudit(threeEngineResponse.quote, threeEngineResponse.auditData);
      return threeEngineResponse.quote.toResponse();
    }

    // 7. Determine peak hour
    // For strategy-based engines, peak hour is evaluated per-strategy inside the engine
    // The use-case passes isOperationalPeakHour as a computed hint
    const hourOfDay = now.getHours();

    // 8. Build pricing input
    const pricingInput: PricingInput = {
      distanceKm: routeResult.distanceKm,
      durationMinutes: routeResult.durationMinutes,
      packageWeightKg: request.packageWeightKg,
      packageDimensions: request.packageDimensions,
      deliveryZone,
      isCoD: request.isCoD ?? false,
      isOperationalPeakHour: false, // evaluated per-strategy in the engine
      courierCompensationEstimate: courierCost.totalCompensation,
      routeSource: routeResult.source,
      originRegion: zoneResult.originRegion,
      destinationRegion: zoneResult.destinationRegion,
      itemValueTzs: request.itemValueTzs,
    };

    // Determine peak hour against local urban config (applies to local/metro)
    // For intercity, peak surcharge is not currently applied (line-haul isn't peak-sensitive)
    const localUrbanConfig = config.localUrban;
    if (localUrbanConfig) {
      (pricingInput as any).isOperationalPeakHour = localUrbanConfig.operationalSurcharge.peakHours.some(
        w => hourOfDay >= w.startHour && hourOfDay < w.endHour,
      );
    }

    // 9. Compute pricing
    const pricingResult = this.pricingEngine.compute(pricingInput, config);

    // 9a. Engine returned DELIVERY_UNAVAILABLE (e.g. no corridor configured)
    if (isDeliveryUnavailable(pricingResult)) {
      const unavailableQuoteData: QuoteData = {
        quoteId,
        deliveryFee: 0,
        courierCompensationEstimate: courierCost.totalCompensation,
        platformMarginAmount: 0,
        pricingVersion: config.version,
        originLat: request.originLat,
        originLng: request.originLng,
        originAddress: request.originAddress,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        destinationAddress: request.destinationAddress,
        packageWeightKg: request.packageWeightKg,
        deliveryZone,
        status: 'DELIVERY_UNAVAILABLE',
        issuedAt: now,
        expiresAt,
        breakdown: null,
        unavailableReason: pricingResult.reason,
      };
      const unavailableQuote = new Quote(unavailableQuoteData);
      await this.quoteRepo.save(unavailableQuote);
      return unavailableQuote.toResponse();
    }

    // 10. Build Quote entity (ACTIVE)
    const quoteData: QuoteData = {
      quoteId,
      deliveryFee: pricingResult.deliveryFee,
      courierCompensationEstimate: courierCost.totalCompensation,
      platformMarginAmount: pricingResult.breakdown.platformMarginAmount,
      pricingVersion: config.version,
      originLat: request.originLat,
      originLng: request.originLng,
      originAddress: request.originAddress,
      destinationLat: request.destinationLat,
      destinationLng: request.destinationLng,
      destinationAddress: request.destinationAddress,
      packageWeightKg: request.packageWeightKg,
      deliveryZone,
      status: 'ACTIVE',
      issuedAt: now,
      expiresAt,
      breakdown: pricingResult.breakdown,
    };
    const quote = new Quote(quoteData);

    // 11. Persist quote + audit
    await this.persistQuoteAndAudit(quote, {
      id: makeId('par'),
      quoteId,
      pricingVersion: config.version,
      courierCompensationEstimate: courierCost.totalCompensation,
      buyerDeliveryFee: pricingResult.deliveryFee,
      platformMarginAmount: pricingResult.breakdown.platformMarginAmount,
      deliveryZone,
      packageWeightKg: request.packageWeightKg,
      distanceKm: routeResult.distanceKm,
      durationMinutes: routeResult.durationMinutes,
      recordedAt: now,
    });

    // 12. Return response
    return quote.toResponse();
  }

  /**
   * Phase 3 §3.1 / MYS-DEL-001 Article 4.6 — the three-engine pipeline:
   *   FulfillmentCostEngine → DriverCompensationEngine → BuyerPriceEngine
   *   → FinancialFeasibilityEngine (gate).
   *
   * Returns null when there is no active VehicleTariff or anything fails,
   * so the caller falls back to the interim 11-stage pipeline. The fallback
   * path does NOT run the feasibility engine and stores feasibility=null
   * on the breakdown, which the classification layer treats as UNVERIFIED.
   */
  private tryThreeEnginePath(params: {
    activeTariff: VehicleTariff | null;
    routeResult: { distanceKm: number; durationMinutes: number };
    request: DeliveryQuoteRequest;
    config: { version: number; platformMarginPct: number; mobileMoneyProcessingRatePct: number };
    now: Date;
    quoteId: string;
    expiresAt: Date;
    deliveryZone: DeliveryZone;
    merchantContributionResult?: import('../../domain/engines/merchant-contribution.engine').MerchantContributionResult | null;
    subsidyAuthorization?: import('../../domain/engines/subsidy-governance.engine').AuthorizedSubsidy | null;
  }): { quote: Quote; auditData: PricingAuditRecordData } | null {
    const { activeTariff, routeResult, request, config, now, quoteId, expiresAt, deliveryZone } = params;
    if (!activeTariff) return null;

    try {
      const tariff = {
        baseOperatingCostTzs: activeTariff.baseOperatingCostTzs,
        costPerKmTzs: activeTariff.costPerKmTzs,
        costPerHourTzs: activeTariff.costPerHourTzs,
        loadingFeeTzs: activeTariff.loadingFeeTzs,
        unloadingFeeTzs: activeTariff.unloadingFeeTzs,
        waitingRateTzsPerMinute: activeTariff.waitingRateTzsPerMinute,
        freeWaitMinutes: activeTariff.freeWaitMinutes,
      };

      // Engine 1: what the delivery actually costs Maysar to perform.
      const fulfillmentCost = this.fulfillmentCostEngine.compute({
        distanceKm: routeResult.distanceKm,
        durationMinutes: routeResult.durationMinutes,
        tariff,
      });

      // Engine 2: what the carrier receives (independent of buyer pricing).
      // The hard minimum-earnings gate is enforced at dispatch (Phase 5);
      // here the flag is recorded on the breakdown for visibility.
      const driverCompensation = this.driverCompensationEngine.compute({
        distanceKm: routeResult.distanceKm,
        durationMinutes: routeResult.durationMinutes,
        tariff: {
          baseOperatingCostTzs: tariff.baseOperatingCostTzs,
          costPerKmTzs: tariff.costPerKmTzs,
          costPerHourTzs: tariff.costPerHourTzs,
          minimumJobCompensationTzs: activeTariff.minimumJobCompensationTzs,
          waitingRateTzsPerMinute: tariff.waitingRateTzsPerMinute,
          freeWaitMinutes: tariff.freeWaitMinutes,
        },
        load: { weightKg: request.packageWeightKg },
      });

      // Engine 3: the buyer price — the only place Maysar margin is calculated.
      const buyerPrice = this.buyerPriceEngine.compute({
        fulfillmentCost,
        serviceFee: { marginPct: Math.min(1, Math.max(0, config.platformMarginPct)) },
      });

      // Engine 4 (MYS-DEL-001 Article 4.6): financial feasibility gate.
      // Merchant contribution is EXPECTED at quote time — not CONFIRMED.
      // Per Article 4.4, EXPECTED contributions are NOT counted in totalFunding.
      // They are recorded in the breakdown for dashboard visibility only.
      // Payment processing cost: use mobile money rate as the conservative default
      // at quote time (actual method unknown until checkout confirmation).
      const merchantContribution = params.merchantContributionResult ?? null;
      const paymentProcessingCostTzs = Math.round(
        buyerPrice.finalBuyerPriceTzs * config.mobileMoneyProcessingRatePct
      );

      // For PERCENTAGE_OF_FEE policies, we now know the buyer price so we can
      // recompute the contribution with the actual fee.
      let finalMerchantContribution = merchantContribution;
      if (
        merchantContribution &&
        merchantContribution.contributionType === 'PERCENTAGE_OF_FEE' &&
        params.merchantContributionResult !== null
      ) {
        try {
          const policy = {
            merchantId: merchantContribution.merchantId,
            type: merchantContribution.contributionType,
            rate: undefined as number | undefined,
            agreementRef: merchantContribution.agreementRef ?? undefined,
          };
          // Re-compute with actual buyer price now available
          finalMerchantContribution = this.merchantContributionEngine.compute({
            policy: { ...policy, type: merchantContribution.contributionType },
            customerDeliveryFeeTzs: buyerPrice.finalBuyerPriceTzs,
          });
        } catch {
          // Fall back to the original estimate
        }
      }

      // MYS-DEL-001 Article 4.5 — apply the subsidy authorization if present.
      // The SubsidyGovernanceEngine validates expiry and authorization; it
      // computes the deficit as the gap between fulfillment cost and buyer price.
      let subsidyApplication: import('../../domain/engines/subsidy-governance.engine').SubsidyApplicationResult | null = null;
      const rawSubsidy = params.subsidyAuthorization ?? null;
      if (rawSubsidy) {
        const deficit = Math.max(0, fulfillmentCost.totalFulfillmentCostTzs - buyerPrice.finalBuyerPriceTzs);
        subsidyApplication = this.subsidyGovernanceEngine.apply({
          authorization: rawSubsidy,
          deficitTzs: deficit,
          issuedAt: now,
        });
        if (!subsidyApplication.isValid) {
          console.warn(
            '[RequestDeliveryQuoteUseCase] Subsidy authorization invalid for quote',
            quoteId, ':', subsidyApplication.invalidReason,
          );
          subsidyApplication = null;
        }
      }

      const feasibility = this.financialFeasibilityEngine.compute({
        funding: {
          customerDeliveryFeeTzs: buyerPrice.finalBuyerPriceTzs,
          merchantContribution: finalMerchantContribution,
          confirmedPartnerContributionTzs: 0, // resolved at settlement
          subsidyApplication,
        },
        costs: {
          driverPayoutTzs: driverCompensation.totalCompensationTzs,
          otherFulfillmentExpensesTzs: 0,     // loading/unloading captured in fulfillmentCost
          paymentProcessingExpensesTzs: paymentProcessingCostTzs,
          codExpensesTzs: 0,                  // resolved at settlement
        },
        dataQuality: {
          driverCompensationFromRealTariff: true, // VehicleTariff is active
          fulfillmentCostFromConfig: true,         // tariff-backed calculation
          paymentCostFromActualRates: true,        // from configured processing rate
        },
        pricingVersion: config.version,
        costModelVersion: `vehicle-tariff-v${activeTariff.version}`,
        financialAssumptions: [
          `Payment processing cost: mobile money rate ${(config.mobileMoneyProcessingRatePct * 100).toFixed(2)}% applied as conservative default — actual method determined at checkout.`,
          finalMerchantContribution
            ? `Merchant contribution (${finalMerchantContribution.contributionType}): TZS ${finalMerchantContribution.expectedContributionTzs} EXPECTED — not counted in totalFunding until confirmed at settlement.`
            : 'No merchant delivery contribution arrangement found.',
          subsidyApplication?.isValid
            ? `Subsidy applied: ${subsidyApplication.purpose} (${subsidyApplication.fundingSource}) — TZS ${subsidyApplication.appliedAmountTzs}.`
            : 'No active subsidy authorization for this route.',
          `Driver compensation computed from VehicleTariff version ${activeTariff.version}.`,
        ],
        issuedAt: now,
      });

      // Log any blocking reasons or warnings — these go to ops monitoring.
      if (!feasibility.isApproved) {
        console.error(
          '[RequestDeliveryQuoteUseCase] Feasibility gate blocked quote:',
          feasibility.blockingReasons,
        );
        // For now: return null to fall through to the 11-stage pipeline rather
        // than hard-blocking the quote endpoint. A future phase will make this
        // a hard block once driver and cost data are fully populated.
      }
      if (feasibility.warnings.length > 0) {
        console.warn(
          '[RequestDeliveryQuoteUseCase] Feasibility warnings for quote',
          quoteId, ':', feasibility.warnings,
        );
      }

      const breakdown: ThreeEngineQuoteBreakdown = {
        engineVersion: 'three-engine-v1',
        fulfillmentCost,
        driverCompensation,
        buyerPrice,
        feasibility,
      };

      const quoteData: QuoteData = {
        quoteId,
        deliveryFee: buyerPrice.finalBuyerPriceTzs,
        courierCompensationEstimate: driverCompensation.totalCompensationTzs,
        platformMarginAmount: buyerPrice.maysarMarginTzs,
        pricingVersion: config.version,
        originLat: request.originLat,
        originLng: request.originLng,
        originAddress: request.originAddress,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        destinationAddress: request.destinationAddress,
        packageWeightKg: request.packageWeightKg,
        deliveryZone,
        status: 'ACTIVE',
        issuedAt: now,
        expiresAt,
        breakdown,
      };
      const quote = new Quote(quoteData);

      const auditData: PricingAuditRecordData = {
        id: makeId('par'),
        quoteId,
        pricingVersion: config.version,
        courierCompensationEstimate: driverCompensation.totalCompensationTzs,
        buyerDeliveryFee: buyerPrice.finalBuyerPriceTzs,
        platformMarginAmount: buyerPrice.maysarMarginTzs,
        deliveryZone,
        packageWeightKg: request.packageWeightKg,
        distanceKm: routeResult.distanceKm,
        durationMinutes: routeResult.durationMinutes,
        recordedAt: now,
      };

      return { quote, auditData };
    } catch (err: any) {
      console.error('[RequestDeliveryQuoteUseCase] Three-engine path failed, falling back to 11-stage pipeline:', err?.message);
      return null;
    }
  }

  private async persistQuoteAndAudit(quote: Quote, auditData: PricingAuditRecordData): Promise<void> {
    await this.quoteRepo.save(quote);
    await this.auditRepo.save(new PricingAuditRecord(auditData));
  }
}
