/**
 * Live verification: Vehicle + versioned VehicleTariff (Phase 2 §2.3).
 * Verifies that saving a second tariff for the same vehicle produces a new
 * version (never overwrites v1), and that both versions remain queryable.
 * Run: npx tsx scripts/verify-vehicle-tariff.ts
 */
import { PrismaClient } from '@prisma/client';
import { Vehicle } from '../services/logistics-service/src/domain/entities/vehicle.entity';
import { VehicleTariff } from '../services/logistics-service/src/domain/entities/vehicle-tariff.entity';
import { PrismaVehicleRepository, PrismaVehicleTariffRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-vehicle-tariff.repository';

async function main() {
  const prisma = new PrismaClient();
  (globalThis as any).prisma = prisma;

  const vehicleRepo = new PrismaVehicleRepository();
  const tariffRepo = new PrismaVehicleTariffRepository();
  const driverId = `drv_verify_${Date.now()}`;

  // 1. Create an active vehicle
  const vehicle = Vehicle.create({
    driverId,
    vehicleType: 'MOTORCYCLE',
    maxWeightKg: 30,
    maxVolumeM3: null,
    cargoDimensions: null,
    servesAreas: ['Kinondoni', 'Ilala'],
    operatingHours: [{ dayOfWeek: 1, startHour: 8, endHour: 18 }],
    hasRefrigeration: false,
    handlesFragile: true,
    isActive: true,
  });
  await vehicleRepo.save(vehicle);

  // 2. Save tariff v1
  const t1 = VehicleTariff.create({
    vehicleId: vehicle.id,
    baseOperatingCostTzs: 2000,
    costPerKmTzs: 500,
    costPerHourTzs: 12000,
    minimumJobCompensationTzs: 3000,
    loadingFeeTzs: 0,
    unloadingFeeTzs: 0,
    waitingRateTzsPerMinute: 50,
    freeWaitMinutes: 5,
  });
  await tariffRepo.save(t1);

  // 3. Save tariff v2 (rates changed) — must become version 2, v1 preserved
  const t2 = VehicleTariff.create({
    vehicleId: vehicle.id,
    baseOperatingCostTzs: 2500,
    costPerKmTzs: 450,
    costPerHourTzs: 13000,
    minimumJobCompensationTzs: 3500,
    loadingFeeTzs: 500,
    unloadingFeeTzs: 500,
    waitingRateTzsPerMinute: 60,
    freeWaitMinutes: 10,
  });
  await tariffRepo.save(t2);

  const versions = await tariffRepo.findVersionsForVehicle(vehicle.id);
  const latest = await tariffRepo.findLatestActive(vehicle.id);
  const v1 = await tariffRepo.findVersion(vehicle.id, 1);

  console.log('versions:', versions.map(v => v.version));
  console.log('latest version:', latest?.version, 'costPerKm:', latest?.costPerKmTzs);
  console.log('v1 costPerKm preserved:', v1?.costPerKmTzs);

  // Cleanup
  await prisma.logistics_VehicleTariff.deleteMany({ where: { vehicleId: vehicle.id } });
  await prisma.logistics_Vehicle.deleteMany({ where: { id: vehicle.id } });
  console.log('cleanup done');

  const ok = versions.length === 2
    && versions[0].version === 1 && versions[1].version === 2
    && latest?.version === 2
    && v1?.costPerKmTzs === 500
    && latest?.costPerKmTzs === 450;
  console.log(ok ? 'VERIFY: PASS' : 'VERIFY: FAIL');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });