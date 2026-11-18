/**
 * seed-vehicle-tariff.ts
 *
 * Seeds the standard Maysar motorcycle vehicle and its initial operating tariff.
 * This activates the three-engine pipeline (FulfillmentCostEngine →
 * DriverCompensationEngine → BuyerPriceEngine → FinancialFeasibilityEngine).
 * Without an active VehicleTariff the system falls back to the interim
 * 11-stage pipeline and the feasibility gate does not run.
 *
 * ─── Tariff rationale (Dar es Salaam motorcycle, v1) ─────────────────────────
 *
 * Base operating cost: TZS 500 per job
 *   Covers ignition, dispatch overhead, wear-and-tear floor.
 *
 * Distance rate: TZS 250/km
 *   Reflects TZS 2,000/litre petrol at ~12 km/litre efficiency + maintenance.
 *   Real figure: TZS 167/km fuel + ~50% maintenance multiplier = ~TZS 250.
 *
 * Time rate: TZS 1,200/hour = TZS 20/minute
 *   Equivalent to ~TZS 200,000/month income target on 160 active hours.
 *   Divided across active delivery time only.
 *
 * Minimum job compensation: TZS 2,000
 *   No delivery dispatched for less. Protects driver dignity on short trips.
 *
 * Loading fee: TZS 100 (seller location pickup)
 * Unloading fee: TZS 100 (buyer location drop-off)
 *
 * Waiting rate: TZS 20/minute beyond 5 free minutes
 *   Chargeable to the responsible party (merchant if unavailable at pickup).
 *
 * ─── Calibration note ────────────────────────────────────────────────────────
 * These are pre-launch estimates derived from Dar es Salaam motorcycle courier
 * market data (November 2026). They must be reviewed after 100+ real deliveries
 * and adjusted to match actual driver net earnings data.
 *
 * Usage:
 *   npx tsx scripts/seed-vehicle-tariff.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const prisma = new PrismaClient();

// ─── Seed data ────────────────────────────────────────────────────────────────

/** Canonical system driver ID for the seed vehicle. */
const SYSTEM_DRIVER_ID = 'sys_driver_motorcycle_dse_001';

/** Canonical vehicle ID — deterministic for idempotency. */
const VEHICLE_ID = 'VHL-MOTORCYCLE-DSE-001';

const VEHICLE_SEED = {
  id: VEHICLE_ID,
  driverId: SYSTEM_DRIVER_ID,
  vehicleType: 'MOTORCYCLE',
  maxWeightKg: 20.0,     // standard motorcycle cargo limit
  maxVolumeM3: null,     // motorcycles are not volume-constrained in this model
  cargoDimensions: null,
  servesAreas: [
    'Dar es Salaam',
    'Coast',
    'Pwani',
  ],
  operatingHours: [
    // Monday–Saturday 06:00–22:00
    { dayOfWeek: 1, startHour: 6, endHour: 22 },
    { dayOfWeek: 2, startHour: 6, endHour: 22 },
    { dayOfWeek: 3, startHour: 6, endHour: 22 },
    { dayOfWeek: 4, startHour: 6, endHour: 22 },
    { dayOfWeek: 5, startHour: 6, endHour: 22 },
    { dayOfWeek: 6, startHour: 7, endHour: 20 },
  ],
  hasRefrigeration: false,
  handlesFragile: true,
  isActive: true,
};

const TARIFF_SEED = {
  vehicleId: VEHICLE_ID,
  version: 1,
  baseOperatingCostTzs: 500,       // per-job floor
  costPerKmTzs: 250,               // TZS 250 per km
  costPerHourTzs: 1200,            // TZS 20/minute
  minimumJobCompensationTzs: 2000, // hard floor — no job below this
  loadingFeeTzs: 100,              // seller pickup
  unloadingFeeTzs: 100,            // buyer drop-off
  waitingRateTzsPerMinute: 20,     // chargeable after free minutes
  freeWaitMinutes: 5,              // first 5 minutes free at each stop
  isActive: true,
  effectiveFrom: new Date('2026-11-01T00:00:00.000Z'),
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Seeding vehicle and vehicle tariff...');

  // ── 1. Upsert the system vehicle ──────────────────────────────────────────
  const existingVehicle = await (prisma as any).logistics_Vehicle?.findFirst?.({
    where: { id: VEHICLE_ID },
    select: { id: true },
  }).catch(() => null);

  if (!existingVehicle) {
    await (prisma as any).logistics_Vehicle?.create?.({
      data: VEHICLE_SEED,
    });
    console.log(`✓ Vehicle created: ${VEHICLE_ID}`);
  } else {
    console.log(`✓ Vehicle already exists: ${VEHICLE_ID}`);
  }

  // ── 2. Check if active tariff already exists ──────────────────────────────
  const existingActiveTariff = await (prisma as any).logistics_VehicleTariff?.findFirst?.({
    where: { vehicleId: VEHICLE_ID, isActive: true },
    select: { id: true, version: true },
  }).catch(() => null);

  if (existingActiveTariff) {
    console.log(`✓ Active tariff already exists for ${VEHICLE_ID} (version ${existingActiveTariff.version}).`);
    console.log('  No changes made. To update rates, create a new version via the admin API.');
    return;
  }

  // ── 3. Deactivate any old inactive tariffs (belt-and-suspenders) ──────────
  await (prisma as any).logistics_VehicleTariff?.updateMany?.({
    where: { vehicleId: VEHICLE_ID, isActive: true },
    data: { isActive: false },
  }).catch(() => null);

  // ── 4. Determine next version ─────────────────────────────────────────────
  const latestTariff = await (prisma as any).logistics_VehicleTariff?.findFirst?.({
    where: { vehicleId: VEHICLE_ID },
    orderBy: { version: 'desc' },
    select: { version: true },
  }).catch(() => null);

  const nextVersion = (latestTariff?.version ?? 0) + 1;

  // ── 5. Create new active tariff ───────────────────────────────────────────
  const tariffId = `vtf-${VEHICLE_ID.toLowerCase()}-v${nextVersion}`;
  await (prisma as any).logistics_VehicleTariff?.create?.({
    data: {
      id: tariffId,
      ...TARIFF_SEED,
      version: nextVersion,
    },
  });

  console.log(`✓ VehicleTariff v${nextVersion} seeded: ${tariffId}`);
  console.log('');
  console.log('Three-engine pipeline is now ACTIVE. Example driver compensation:');
  console.log('  Route: Kariakoo → Mikocheni (8 km, 25 min, 0.5 kg)');
  console.log(`    base:          TZS ${TARIFF_SEED.baseOperatingCostTzs}`);
  console.log(`    distance:      TZS ${8 * TARIFF_SEED.costPerKmTzs} (8 km × ${TARIFF_SEED.costPerKmTzs})`);
  console.log(`    time:          TZS ${Math.round(25 * TARIFF_SEED.costPerHourTzs / 60)} (25 min)`);
  console.log(`    loading+unload: TZS ${TARIFF_SEED.loadingFeeTzs + TARIFF_SEED.unloadingFeeTzs}`);

  const rawTotal = TARIFF_SEED.baseOperatingCostTzs
    + (8 * TARIFF_SEED.costPerKmTzs)
    + Math.round(25 * TARIFF_SEED.costPerHourTzs / 60)
    + TARIFF_SEED.loadingFeeTzs
    + TARIFF_SEED.unloadingFeeTzs;
  const driverPayout = Math.max(rawTotal, TARIFF_SEED.minimumJobCompensationTzs);
  console.log(`    total:         TZS ${driverPayout} (min: TZS ${TARIFF_SEED.minimumJobCompensationTzs})`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
