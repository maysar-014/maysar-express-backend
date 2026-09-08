/**
 * FulfillmentOptionEngine (Phase 4 §4.1 + §4.3)
 *
 * Given a set of Shipments, generates all FEASIBLE delivery options — each a
 * complete fulfillment plan, not a label:
 *   SUPPLIER_DELIVERY  seller's own carrier (pass-through, minimal margin)
 *   MAYSAR_SHARED      consolidated with other orders (cheaper, less certain)
 *   MAYSAR_EXPRESS     dedicated Maysar route (faster, premium price)
 *   CUSTOMER_PICKUP    buyer collects (TZS 0, only for pickup-eligible sellers)
 *
 * Hierarchy (backlog rule 8 — DO NOT REVERSE): feasibility checks run FIRST
 * and eliminate infeasible options BEFORE ranking. Infeasible options are
 * returned in `excluded` with the reason — escalated, never silently dropped.
 *
 * COD trust tiers (§4.3) gate option eligibility:
 *   NEW_BUYER      local zones only (≤ maxLocalRadiusKm, default 24 km);
 *                  MAYSAR_EXPRESS eligible, MAYSAR_SHARED restricted
 *   TRUSTED_BUYER  all options; FLEXIBLE-window discount unlocked
 *   GOLD_BUYER     nationwide fulfillment; highest-tier consolidation
 *
 * Pricing uses the Phase 3 three-engine pipeline (BuyerPriceEngine is the
 * only place margin is calculated). Pure: distances are Haversine×1.35
 * estimates — preliminary only, per backlog rule 10.
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';
import { haversineKm } from '../services/haversine';
import { VehicleClass } from '../entities/shipment.entity';
import { VehicleTariff } from '../entities/vehicle-tariff.entity';
import { FulfillmentCostEngine, FulfillmentCostBreakdown } from './fulfillment-cost.engine';
import { DriverCompensationEngine } from './driver-compensation.engine';
import { BuyerPriceEngine } from './buyer-price.engine';

export type FulfillmentOptionType = 'SUPPLIER_DELIVERY' | 'MAYSAR_SHARED' | 'MAYSAR_EXPRESS' | 'CUSTOMER_PICKUP';
export type DeliveryWindowPreference = 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';
export type BuyerTrustTier = 'NEW_BUYER' | 'TRUSTED_BUYER' | 'GOLD_BUYER';

export interface OptionShipment {
  shipmentId: string;
  sellerId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  packageWeightKg: number;
  requiredVehicleClass?: VehicleClass | null;
  /** Seller allows buyer pickup (gate for CUSTOMER_PICKUP). */
  pickupEligible?: boolean;
}

export interface FulfillmentOption {
  optionType: FulfillmentOptionType;
  fulfillmentPlanId: string;
  shipmentIds: string[];
  sellerCount: number;
  estimatedPickupAt: Date;
  estimatedDeliveryAt: Date;
  deliveryWindow: DeliveryWindowPreference;
  buyerPriceTzs: number;
  driverCompensationTzs: number;
  maysarMarginTzs: number;
  fulfillmentCostTzs: number;
  /** Driver minimum-earnings gate result (hard constraint visibility). */
  driverMeetsMinimumEarnings: boolean;
  /** True when the MAYSAR_SHARED discount came from a FLEXIBLE window. */
  flexibleWindowDiscountApplied: boolean;
  distanceKm: number;
  deliveryZone: 'local' | 'metro' | 'intercity';
}

export interface ExcludedOption {
  optionType: FulfillmentOptionType;
  reason: string;
}

export interface FulfillmentOptionRequest {
  shipments: OptionShipment[];
  buyer: { lat: number; lng: number; address: string };
  tariff: VehicleTariff;
  /** Maysar service margin as a fraction (e.g. 0.20). */
  marginPct: number;
  buyerTrustTier: BuyerTrustTier;
  deliveryWindowPreference?: DeliveryWindowPreference;
  /** Explicit consolidation signal (e.g. from the consolidation engine). */
  consolidationAvailable?: boolean;
  /** Vehicle classes the active fleet can actually serve. */
  availableVehicleTypes?: VehicleClass[];
  /** Capacity of the largest available vehicle (kg) — hard feasibility gate. */
  availableVehicleCapacityKg?: number;
  /** NEW_BUYER geographic limit (km). Default 24 per backlog. */
  maxLocalRadiusKm?: number;
  /** MAYSAR_EXPRESS premium on fulfillment cost (default 1.25). */
  expressPremiumPct?: number;
  /** Maysar margin kept on SUPPLIER_DELIVERY pass-through (default 0.05). */
  supplierDeliveryMarginPct?: number;
  /** FLEXIBLE-window shared discount (default 0.10) — TRUSTED_BUYER+ only. */
  flexibleWindowDiscountPct?: number;
  now?: Date;
}

export interface FulfillmentOptionResult {
  options: FulfillmentOption[];
  excluded: ExcludedOption[];
}

const DEFAULTS = {
  maxLocalRadiusKm: 24,
  expressPremiumPct: 1.25,
  supplierDeliveryMarginPct: 0.05,
  flexibleWindowDiscountPct: 0.10,
  sharedEtaFactor: 1.2,
  expressEtaFactor: 0.8,
  /** Indicative buyer cost share of a consolidated route (30% saving). */
  sharedCostFactor: 0.7,
};

const ROAD_FACTOR = 1.35; // preliminary estimate only (rule 10)

let planSeq = 0;
function makePlanId(): string {
  return `fpl_${Date.now()}_${++planSeq}`;
}

export class FulfillmentOptionEngine {
  private readonly costEngine = new FulfillmentCostEngine();
  private readonly compEngine = new DriverCompensationEngine();
  private readonly priceEngine = new BuyerPriceEngine();

  generate(request: FulfillmentOptionRequest): FulfillmentOptionResult {
    const now = request.now ?? new Date();
    const nowMs = now.getTime();
    const maxLocalRadiusKm = request.maxLocalRadiusKm ?? DEFAULTS.maxLocalRadiusKm;
    const buyer = GeoPoint.create(request.buyer.lat, request.buyer.lng, request.buyer.address);
    if (!request.shipments.length) return { options: [], excluded: [] };

    // ── Hierarchy 1: FEASIBILITY (hard gates, evaluated before anything else)
    const excluded: ExcludedOption[] = [];
    const options: FulfillmentOption[] = [];
    const totalWeight = request.shipments.reduce((s, x) => s + x.packageWeightKg, 0);

    // 1a. Vehicle capacity — hard gate for any Maysar-fulfilled option.
    const capacityKg = request.availableVehicleCapacityKg;
    if (capacityKg !== undefined && totalWeight > capacityKg) {
      excluded.push({ optionType: 'MAYSAR_EXPRESS', reason: `Total weight ${totalWeight}kg exceeds largest available vehicle capacity ${capacityKg}kg` });
      excluded.push({ optionType: 'MAYSAR_SHARED', reason: `Total weight ${totalWeight}kg exceeds largest available vehicle capacity ${capacityKg}kg` });
    }

    // 1b. Vehicle-class compatibility — required classes must be servable.
    const required = request.shipments.map(s => s.requiredVehicleClass ?? null).filter((c): c is VehicleClass => !!c);
    const distinctRequired = new Set(required);
    if (distinctRequired.size > 1) {
      excluded.push({ optionType: 'MAYSAR_EXPRESS', reason: `Incompatible requiredVehicleClass values: ${[...distinctRequired].join(', ')}` });
      excluded.push({ optionType: 'MAYSAR_SHARED', reason: `Incompatible requiredVehicleClass values: ${[...distinctRequired].join(', ')}` });
    } else if (required[0] && request.availableVehicleTypes && !request.availableVehicleTypes.includes(required[0])) {
      excluded.push({ optionType: 'MAYSAR_EXPRESS', reason: `No available vehicle of class ${required[0]}` });
      excluded.push({ optionType: 'MAYSAR_SHARED', reason: `No available vehicle of class ${required[0]}` });
    }

    // 1c. Distance feasibility + COD trust tier (§4.3).
    const distances = request.shipments.map(s =>
      haversineKm(GeoPoint.create(s.pickupLat, s.pickupLng, s.pickupAddress), buyer) * ROAD_FACTOR,
    );
    const longestDistanceKm = Math.max(...distances);
    const isLocal = longestDistanceKm <= maxLocalRadiusKm;
    const tier = request.buyerTrustTier;
    if (tier === 'NEW_BUYER' && !isLocal) {
      excluded.push({ optionType: 'MAYSAR_EXPRESS', reason: `NEW_BUYER radius limit ${maxLocalRadiusKm}km (route ~${Math.round(longestDistanceKm)}km)` });
    }

    // 1d. Consolidation availability + NEW_BUYER shared restriction.
    const consolidationAvailable = request.consolidationAvailable ?? (request.shipments.length > 1);
    if (!consolidationAvailable) {
      excluded.push({ optionType: 'MAYSAR_SHARED', reason: 'No consolidation candidates in window' });
    }
    if (tier === 'NEW_BUYER') {
      excluded.push({ optionType: 'MAYSAR_SHARED', reason: 'MAYSAR_SHARED restricted for NEW_BUYER tier' });
    }

    // 1e. CUSTOMER_PICKUP eligibility.
    if (!request.shipments.every(s => s.pickupEligible === true)) {
      excluded.push({ optionType: 'CUSTOMER_PICKUP', reason: 'Not all sellers are pickup-eligible' });
    }

    const has = (t: FulfillmentOptionType) => !excluded.some(e => e.optionType === t);
    const windowPref: DeliveryWindowPreference = request.deliveryWindowPreference ?? 'STANDARD';
    // FLEXIBLE-window discount unlocked only from TRUSTED_BUYER (§4.3).
    const flexibleDiscount = windowPref === 'FLEXIBLE' && tier !== 'NEW_BUYER'
      ? (request.flexibleWindowDiscountPct ?? DEFAULTS.flexibleWindowDiscountPct)
      : 0;
    const shipmentCount = request.shipments.length;

    // ── SUPPLIER_DELIVERY: pass-through, minimal margin, no Maysar driver ────
    if (has('SUPPLIER_DELIVERY')) {
      const eta = this.etaMinutes(longestDistanceKm);
      const cost = this.costEngine.compute({
        distanceKm: longestDistanceKm, durationMinutes: eta, tariff: this.costTariff(request.tariff),
      });
      const price = this.priceEngine.compute({
        fulfillmentCost: cost,
        serviceFee: { marginPct: request.supplierDeliveryMarginPct ?? DEFAULTS.supplierDeliveryMarginPct },
      });
      options.push({
        optionType: 'SUPPLIER_DELIVERY',
        fulfillmentPlanId: makePlanId(),
        shipmentIds: request.shipments.map(s => s.shipmentId),
        sellerCount: shipmentCount,
        estimatedPickupAt: new Date(nowMs + 60 * 60 * 1000),
        estimatedDeliveryAt: new Date(nowMs + eta * 60 * 1000),
        deliveryWindow: 'STANDARD',
        buyerPriceTzs: price.finalBuyerPriceTzs,
        driverCompensationTzs: 0, // seller's own carrier — outside Maysar settlement
        maysarMarginTzs: price.maysarMarginTzs,
        fulfillmentCostTzs: cost.totalFulfillmentCostTzs,
        driverMeetsMinimumEarnings: true,
        flexibleWindowDiscountApplied: false,
        distanceKm: Math.round(longestDistanceKm * 100) / 100,
        deliveryZone: this.zoneFor(longestDistanceKm, maxLocalRadiusKm),
      });
    }

    // ── MAYSAR_EXPRESS: dedicated route, premium price, fastest ETA ──────────
    if (has('MAYSAR_EXPRESS')) {
      const eta = this.etaMinutes(longestDistanceKm) * DEFAULTS.expressEtaFactor;
      const cost = this.costEngine.compute({
        distanceKm: longestDistanceKm, durationMinutes: eta, tariff: this.costTariff(request.tariff),
      });
      const premiumCost: FulfillmentCostBreakdown = {
        ...cost,
        totalFulfillmentCostTzs: Math.round(cost.totalFulfillmentCostTzs * (request.expressPremiumPct ?? DEFAULTS.expressPremiumPct)),
      };
      const price = this.priceEngine.compute({
        fulfillmentCost: premiumCost,
        serviceFee: { marginPct: request.marginPct },
      });
      const comp = this.compEngine.compute({
        distanceKm: longestDistanceKm,
        durationMinutes: eta,
        tariff: this.compTariff(request.tariff),
        load: { weightKg: totalWeight },
        stopCount: shipmentCount,
      });
      options.push({
        optionType: 'MAYSAR_EXPRESS',
        fulfillmentPlanId: makePlanId(),
        shipmentIds: request.shipments.map(s => s.shipmentId),
        sellerCount: shipmentCount,
        estimatedPickupAt: new Date(nowMs + 30 * 60 * 1000),
        estimatedDeliveryAt: new Date(nowMs + eta * 60 * 1000),
        deliveryWindow: 'EXPRESS',
        buyerPriceTzs: price.finalBuyerPriceTzs,
        driverCompensationTzs: comp.totalCompensationTzs,
        maysarMarginTzs: price.maysarMarginTzs,
        fulfillmentCostTzs: premiumCost.totalFulfillmentCostTzs,
        driverMeetsMinimumEarnings: comp.meetsMinimumEarnings,
        flexibleWindowDiscountApplied: false,
        distanceKm: Math.round(longestDistanceKm * 100) / 100,
        deliveryZone: this.zoneFor(longestDistanceKm, maxLocalRadiusKm),
      });
    }
    // ── MAYSAR_SHARED: consolidated, cheaper, less time-certain ──────────────
    if (has('MAYSAR_SHARED')) {
      const eta = this.etaMinutes(longestDistanceKm) * DEFAULTS.sharedEtaFactor;
      const baseCost = this.costEngine.compute({
        distanceKm: longestDistanceKm, durationMinutes: eta, tariff: this.costTariff(request.tariff),
      });
      // Indicative buyer share of the consolidated route cost (30% saving).
      const sharedCost: FulfillmentCostBreakdown = {
        ...baseCost,
        totalFulfillmentCostTzs: Math.round(baseCost.totalFulfillmentCostTzs * DEFAULTS.sharedCostFactor),
      };
      const price = this.priceEngine.compute({
        fulfillmentCost: sharedCost,
        serviceFee: { marginPct: request.marginPct },
        discountTzs: Math.round(sharedCost.totalFulfillmentCostTzs * flexibleDiscount),
      });
      const comp = this.compEngine.compute({
        distanceKm: longestDistanceKm,
        durationMinutes: eta,
        tariff: this.compTariff(request.tariff),
        load: { weightKg: totalWeight },
        stopCount: shipmentCount,
      });
      options.push({
        optionType: 'MAYSAR_SHARED',
        fulfillmentPlanId: makePlanId(),
        shipmentIds: request.shipments.map(s => s.shipmentId),
        sellerCount: shipmentCount,
        estimatedPickupAt: new Date(nowMs + 2 * 60 * 60 * 1000),
        estimatedDeliveryAt: new Date(nowMs + eta * 60 * 1000),
        deliveryWindow: windowPref === 'FLEXIBLE' ? 'FLEXIBLE' : 'STANDARD',
        buyerPriceTzs: price.finalBuyerPriceTzs,
        driverCompensationTzs: comp.totalCompensationTzs,
        maysarMarginTzs: price.maysarMarginTzs,
        fulfillmentCostTzs: sharedCost.totalFulfillmentCostTzs,
        driverMeetsMinimumEarnings: comp.meetsMinimumEarnings,
        flexibleWindowDiscountApplied: flexibleDiscount > 0,
        distanceKm: Math.round(longestDistanceKm * 100) / 100,
        deliveryZone: this.zoneFor(longestDistanceKm, maxLocalRadiusKm),
      });
    }

    // ── CUSTOMER_PICKUP: TZS 0 delivery — buyer collects ─────────────────────
    if (has('CUSTOMER_PICKUP')) {
      options.push({
        optionType: 'CUSTOMER_PICKUP',
        fulfillmentPlanId: makePlanId(),
        shipmentIds: request.shipments.map(s => s.shipmentId),
        sellerCount: shipmentCount,
        estimatedPickupAt: new Date(nowMs + 2 * 60 * 60 * 1000),
        estimatedDeliveryAt: new Date(nowMs + 2 * 60 * 60 * 1000),
        deliveryWindow: 'FLEXIBLE',
        buyerPriceTzs: 0,
        driverCompensationTzs: 0,
        maysarMarginTzs: 0,
        fulfillmentCostTzs: 0,
        driverMeetsMinimumEarnings: true,
        flexibleWindowDiscountApplied: false,
        distanceKm: 0,
        deliveryZone: 'local',
      });
    }

    // ── Hierarchy 6: DRIVER ECONOMICS — hard gate: escalate, not dispatch ────
    for (const option of [...options]) {
      if (!option.driverMeetsMinimumEarnings) {
        options.splice(options.indexOf(option), 1);
        excluded.push({
          optionType: option.optionType,
          reason: `Driver compensation ${option.driverCompensationTzs} TZS below vehicle minimum — escalated, not offered`,
        });
      }
    }

    return { options, excluded };
  }

  private etaMinutes(distanceKm: number): number {
    // 28 km/h average urban speed → minutes (documented estimate) + 5 min buffer.
    return Math.ceil((distanceKm / 28) * 60) + 5;
  }

  private zoneFor(distanceKm: number, maxLocalRadiusKm: number): 'local' | 'metro' | 'intercity' {
    if (distanceKm <= maxLocalRadiusKm) return 'local';
    if (distanceKm <= 100) return 'metro';
    return 'intercity';
  }

  private costTariff(t: VehicleTariff) {
    return {
      baseOperatingCostTzs: t.baseOperatingCostTzs,
      costPerKmTzs: t.costPerKmTzs,
      costPerHourTzs: t.costPerHourTzs,
      loadingFeeTzs: t.loadingFeeTzs,
      unloadingFeeTzs: t.unloadingFeeTzs,
      waitingRateTzsPerMinute: t.waitingRateTzsPerMinute,
      freeWaitMinutes: t.freeWaitMinutes,
    };
  }

  private compTariff(t: VehicleTariff) {
    return {
      baseOperatingCostTzs: t.baseOperatingCostTzs,
      costPerKmTzs: t.costPerKmTzs,
      costPerHourTzs: t.costPerHourTzs,
      minimumJobCompensationTzs: t.minimumJobCompensationTzs,
      waitingRateTzsPerMinute: t.waitingRateTzsPerMinute,
      freeWaitMinutes: t.freeWaitMinutes,
    };
  }
}
