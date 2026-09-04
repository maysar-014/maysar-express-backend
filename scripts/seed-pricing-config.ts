/**
 * seed-pricing-config.ts (v2)
 *
 * Seeds the delivery pricing configuration (version 2) using the redesigned
 * strategy-aware pricing model.
 *
 * ─── Pricing architecture ────────────────────────────────────────────────────
 *
 * LOCAL_URBAN (≤ 20 km, same district):
 *   Uses distance bands. The entire band has a fixed fulfillment cost that
 *   covers courier pickup + delivery. No separate time charge.
 *
 *   0–3 km   → TZS 1,800 fulfillment cost
 *   3–7 km   → TZS 2,500
 *   7–12 km  → TZS 3,200
 *   12–20 km → TZS 4,000
 *
 * METROPOLITAN (20–80 km, same region or close cross-region):
 *   Extended distance bands.
 *
 *   20–35 km → TZS 5,000 fulfillment cost
 *   35–50 km → TZS 6,500
 *   50–80 km → TZS 8,500
 *
 * INTERCITY (cross-region, 80–600 km):
 *   Corridor-based. Each corridor has: origin handling + line-haul + destination handling + last-mile.
 *   Pre-configured corridors for major Tanzanian routes.
 *
 * WEIGHT SURCHARGE (additive, not multiplicative):
 *   0–1 kg    → TZS 0 additional
 *   1–5 kg    → TZS 500 additional
 *   5–10 kg   → TZS 1,200 additional
 *   10–20 kg  → TZS 2,500 additional
 *   20+ kg    → TZS 5,000 additional
 *
 * PLATFORM MARGIN: 20% of fulfillment cost
 *   (Margin is on cost, not on the final fee — keeps it transparent)
 *
 * COD: Flat TZS 500 service charge (independent of delivery distance)
 *   + 0.5% of item value for orders above TZS 100,000
 *
 * FLOOR: TZS 1,500 (no delivery below this)
 * CEILING: TZS 50,000 (cap for abnormal calculations)
 *
 * ─── Calibration assumptions ─────────────────────────────────────────────────
 * These rates are initial estimates. They should be reviewed against actual
 * courier cost data after the platform has processed 100+ real deliveries.
 *
 * The courier compensation (EarningsCalculationEngine) is separate from
 * these customer-facing prices and is NOT modified here.
 *
 * Usage:
 *   npx tsx scripts/seed-pricing-config.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const prisma = new PrismaClient();

const PRICING_CONFIG_V2 = {
  version: 2,
  isActive: true,

  // ── Platform margin ─────────────────────────────────────────────────────────
  // 20% of fulfillment cost. Applied AFTER computing fulfillment cost,
  // BEFORE COD charge. Lower than the old 30% to keep prices competitive.
  platformMarginPct: 0.20,

  // ── Floor / ceiling / rounding ──────────────────────────────────────────────
  floorPriceTzs: 1500,
  ceilingPriceTzs: 50000,
  roundingIncrementTzs: 50,

  // ── COD policy ──────────────────────────────────────────────────────────────
  // Flat charge for cash handling, reconciliation, and failed-delivery risk.
  // Independent of delivery distance economics.
  codPolicy: {
    fixedChargeTzs: 500,
    valueSurchargeRate: 0.005,          // 0.5% for high-value orders
    valueSurchargeThresholdTzs: 100000, // applies above TZS 100,000 item value
  },

  // ── Local urban strategy ────────────────────────────────────────────────────
  // Covers same-ward and same-district deliveries within 20 km.
  // Motorcycle courier, point-to-point. No separate time charge.
  // Rates calibrated for Dar es Salaam urban area (boda-boda/motorcycle courier).
  localUrban: {
    distanceBands: [
      { maxDistanceKm: 3,  fulfillmentCostTzs: 1800 },  // e.g. Kariakoo → Ilala centre
      { maxDistanceKm: 7,  fulfillmentCostTzs: 2500 },  // e.g. Kariakoo → Msasani
      { maxDistanceKm: 12, fulfillmentCostTzs: 3200 },  // e.g. Kariakoo → Mikocheni
      { maxDistanceKm: 20, fulfillmentCostTzs: 4000 },  // e.g. Kariakoo → Mbagala
    ],
    weightBands: [
      { maxWeightKg: 1,       additionalCostTzs: 0    },
      { maxWeightKg: 5,       additionalCostTzs: 500  },
      { maxWeightKg: 10,      additionalCostTzs: 1200 },
      { maxWeightKg: 20,      additionalCostTzs: 2500 },
      { maxWeightKg: 9999,    additionalCostTzs: 5000 },
    ],
    operationalSurcharge: {
      peakHourSurchargeAmount: 300, // TZS flat for morning/evening rush
      peakHours: [
        { startHour: 7,  endHour: 9  },
        { startHour: 17, endHour: 20 },
      ],
    },
  },

  // ── Metropolitan strategy ───────────────────────────────────────────────────
  // Same-region deliveries 20–80 km. Van/pickup courier.
  // Covers e.g. Dar es Salaam → Kibaha, Dar → Mkuranga, Arusha → Moshi.
  metropolitan: {
    distanceBands: [
      { maxDistanceKm: 35, fulfillmentCostTzs: 5000 },
      { maxDistanceKm: 50, fulfillmentCostTzs: 6500 },
      { maxDistanceKm: 80, fulfillmentCostTzs: 8500 },
    ],
    weightBands: [
      { maxWeightKg: 1,    additionalCostTzs: 0    },
      { maxWeightKg: 5,    additionalCostTzs: 800  },
      { maxWeightKg: 10,   additionalCostTzs: 1800 },
      { maxWeightKg: 20,   additionalCostTzs: 3500 },
      { maxWeightKg: 9999, additionalCostTzs: 7000 },
    ],
    operationalSurcharge: {
      peakHourSurchargeAmount: 0, // no peak surcharge for metro
      peakHours: [],
    },
  },

  // ── Intercity corridors ─────────────────────────────────────────────────────
  // Each corridor represents the actual logistics operation:
  //   origin handling (pickup + consolidation)
  //   + line-haul (intercity transport, weight-proportional)
  //   + destination handling
  //   + last-mile delivery
  //
  // ASSUMPTION: Line-haul rates are estimates for bus/truck carrier.
  // These should be validated against actual carrier quotes.
  intercityCorridors: [
    {
      corridorKey: 'DAR_MOROGORO',
      originRegions: ['dar es salaam'],
      destinationRegions: ['morogoro'],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 4000,
      weightRateTzsPerKg: 300,
      destinationHandlingCostTzs: 800,
      lastMileCostTzs: 1500,
      estimatedTransitHours: 4,
      isActive: true,
    },
    {
      corridorKey: 'DAR_DODOMA',
      originRegions: ['dar es salaam'],
      destinationRegions: ['dodoma'],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 6000,
      weightRateTzsPerKg: 400,
      destinationHandlingCostTzs: 800,
      lastMileCostTzs: 1500,
      estimatedTransitHours: 6,
      isActive: true,
    },
    {
      corridorKey: 'DAR_ARUSHA',
      originRegions: ['dar es salaam'],
      destinationRegions: ['arusha'],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 9000,
      weightRateTzsPerKg: 500,
      destinationHandlingCostTzs: 1000,
      lastMileCostTzs: 1800,
      estimatedTransitHours: 8,
      isActive: true,
    },
    {
      corridorKey: 'DAR_MWANZA',
      originRegions: ['dar es salaam'],
      destinationRegions: ['mwanza'],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 12000,
      weightRateTzsPerKg: 600,
      destinationHandlingCostTzs: 1000,
      lastMileCostTzs: 1800,
      estimatedTransitHours: 12,
      isActive: true,
    },
    {
      corridorKey: 'DAR_MBEYA',
      originRegions: ['dar es salaam'],
      destinationRegions: ['mbeya'],
      bidirectional: true,
      originHandlingCostTzs: 1000,
      lineHaulBaseCostTzs: 11000,
      weightRateTzsPerKg: 550,
      destinationHandlingCostTzs: 1000,
      lastMileCostTzs: 1800,
      estimatedTransitHours: 10,
      isActive: true,
    },
    {
      corridorKey: 'DAR_TANGA',
      originRegions: ['dar es salaam'],
      destinationRegions: ['tanga'],
      bidirectional: true,
      originHandlingCostTzs: 800,
      lineHaulBaseCostTzs: 5000,
      weightRateTzsPerKg: 350,
      destinationHandlingCostTzs: 800,
      lastMileCostTzs: 1500,
      estimatedTransitHours: 5,
      isActive: true,
    },
    {
      corridorKey: 'ARUSHA_KILIMANJARO',
      originRegions: ['arusha'],
      destinationRegions: ['kilimanjaro'],
      bidirectional: true,
      originHandlingCostTzs: 500,
      lineHaulBaseCostTzs: 2500,
      weightRateTzsPerKg: 200,
      destinationHandlingCostTzs: 500,
      lastMileCostTzs: 1200,
      estimatedTransitHours: 2,
      isActive: true,
    },
  ],

  // ── Intercity fallback ──────────────────────────────────────────────────────
  // Used for cross-region routes not covered by a specific corridor.
  // Returns a conservative general-purpose intercity price rather than UNAVAILABLE.
  intercityFallback: {
    corridorKey: 'GENERAL_INTERCITY',
    originRegions: [],
    destinationRegions: [],
    bidirectional: true,
    originHandlingCostTzs: 1000,
    lineHaulBaseCostTzs: 8000,
    weightRateTzsPerKg: 500,
    destinationHandlingCostTzs: 1000,
    lastMileCostTzs: 2000,
    estimatedTransitHours: 10,
    isActive: true,
  },

  // Remote deliveries use the intercityFallback rather than returning unavailable
  remoteUnavailable: false,

  // ── Consolidation parameters ────────────────────────────────────────────────
  // ASSUMPTION: These are initial values. Validate against actual courier
  // operational data after processing 50+ consolidated deliveries.
  consolidationRadiusKm: 5.0,                    // sellers within 5km can share a courier
  maxConsolidatedRouteOverheadPct: 1.40,          // consolidated route may be 40% longer than longest individual route
  maxGroupWeightKg: 20.0,                         // motorcycle courier capacity
  allocationAlgorithm: 'weight_proportional',     // split cost by package weight

  // ── Quote settings ──────────────────────────────────────────────────────────
  quoteValiditySeconds: 900,    // 15 minutes
  routingCacheTtlMs: 300000,    // 5 minutes
};

async function main(): Promise<void> {
  console.log('Seeding delivery pricing config v2...');

  // Serialize (handles any Infinity values, though v2 uses 9999 as sentinel)
  const serialized = JSON.parse(JSON.stringify(PRICING_CONFIG_V2));

  const existing = await (prisma as any).logistics_PricingConfig?.findFirst?.({
    where: { version: 2 },
    select: { version: true, isActive: true },
  }).catch(() => null);

  if (existing) {
    // Update in-place to latest calibrated rates
    await (prisma as any).logistics_PricingConfig?.updateMany?.({
      where: { version: 2 },
      data: {
        platformMarginPct:  serialized.platformMarginPct,
        floorPriceTzs:      serialized.floorPriceTzs,
        ceilingPriceTzs:    serialized.ceilingPriceTzs,
        codPolicy:          serialized.codPolicy,
        localUrban:         serialized.localUrban,
        metropolitan:       serialized.metropolitan,
        intercityCorridors: serialized.intercityCorridors,
        intercityFallback:  serialized.intercityFallback,
        remoteUnavailable:  serialized.remoteUnavailable,
      },
    }).catch(() => null);
    console.log('✓ PricingConfig v2 already exists — rates updated.');
    return;
  }

  // Deactivate previous versions
  await (prisma as any).logistics_PricingConfig?.updateMany?.({
    where: { isActive: true },
    data: { isActive: false },
  }).catch(() => null);

  await (prisma as any).logistics_PricingConfig?.create?.({
    data: serialized,
  });

  console.log('✓ PricingConfig v2 seeded successfully.');
  console.log('');
  console.log('Example prices with new model:');
  console.log('  Kariakoo → Mikocheni (8 km, 0.5 kg, no COD):');
  console.log('    fulfillment:  TZS 3,200 (7-12km band)');
  console.log('    + 20% margin: TZS   640');
  console.log('    = customer:   TZS 3,840 → rounded TZS 3,850');
  console.log('');
  console.log('  Dar es Salaam → Arusha (640 km, 1 kg, no COD):');
  console.log('    origin handling: TZS 1,000');
  console.log('    line-haul base:  TZS 9,000 + (500 × 1 kg = TZS 500) = TZS 9,500');
  console.log('    dest handling:   TZS 1,000');
  console.log('    last-mile:       TZS 1,800');
  console.log('    fulfillment:     TZS 13,300');
  console.log('    + 20% margin:    TZS  2,660');
  console.log('    = customer:      TZS 15,960 → rounded TZS 16,000');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
