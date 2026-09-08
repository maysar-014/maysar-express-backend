/**
 * Live verification: GenerateFulfillmentOptionsUseCase (Phase 4 §4.1) against
 * the real dev DB. Seeds an active VehicleTariff + OptimizationConfig, runs
 * the use case for a Dar es Salaam multi-seller request, verifies ranked
 * options, then cleans up.
 * Run: npx tsx scripts/verify-fulfillment-options.ts
 */
import { PrismaClient } from '@prisma/client';
import { VehicleTariff } from '../services/logistics-service/src/domain/entities/vehicle-tariff.entity';
import { Vehicle } from '../services/logistics-service/src/domain/entities/vehicle.entity';
import { OptimizationConfig } from '../services/logistics-service/src/domain/value-objects/optimization-config.value-object';
import { PrismaVehicleRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-vehicle-tariff.repository';
import { PrismaVehicleTariffRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-vehicle-tariff.repository';
import { PrismaOptimizationConfigRepository } from '../services/logistics-service/src/infrastructure/repositories/prisma-optimization-config.repository';
import { GenerateFulfillmentOptionsUseCase } from '../services/logistics-service/src/application/use-cases/generate-fulfillment-options.use-case';

async function main() {
  const prisma = new PrismaClient();
  (globalThis as any).prisma = prisma;

  // Seed an active vehicle + tariff
  const vehicleRepo = new PrismaVehicleRepository();
  const tariffRepo = new PrismaVehicleTariffRepository();
  const vehicle = Vehicle.create({
    driverId: 'drv_verify_fpo', vehicleType: 'MOTORCYCLE', maxWeightKg: 30, maxVolumeM3: null,
    cargoDimensions: null, servesAreas: ['Kinondoni'], operatingHours: [{ dayOfWeek: 1, startHour: 8, endHour: 18 }],
    hasRefrigeration: false, handlesFragile: true, isActive: true,
  });
  await vehicleRepo.save(vehicle);
  const tariff = VehicleTariff.create({
    vehicleId: vehicle.id, baseOperatingCostTzs: 2000, costPerKmTzs: 500, costPerHourTzs: 12000,
    minimumJobCompensationTzs: 6000, loadingFeeTzs: 300, unloadingFeeTzs: 200,
    waitingRateTzsPerMinute: 50, freeWaitMinutes: 5,
  });
  await tariffRepo.save(tariff);

  // Seed an active OptimizationConfig
  const configRepo = new PrismaOptimizationConfigRepository();
  await configRepo.save(OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() }));
  const activeConfig = await configRepo.findActive();

  const useCase = new GenerateFulfillmentOptionsUseCase();
  const result = await useCase.execute({
    masterOrderId: 'mos_verify_fpo',
    buyerDestination: { lat: -6.7924, lng: 39.2083, address: 'City centre, Dar es Salaam' },
    deliveryWindowPreference: 'FLEXIBLE',
    shipments: [
      { shipmentId: 'SHP_1', sellerId: 's1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 2, pickupEligible: true },
      { shipmentId: 'SHP_2', sellerId: 's2', pickupLat: -6.78, pickupLng: 39.28, pickupAddress: 'Masaki', packageWeightKg: 1.5, pickupEligible: true },
    ],
    buyerTrustTier: 'TRUSTED_BUYER',
  });

  console.log('options:', result.options.map(o => `${o.optionType}(${o.buyerPriceTzs})@${o.score}`));
  console.log('exclusions:', result.exclusions.map(e => e.optionType));
  console.log('weights version:', result.weights.version);

  // Cleanup
  await prisma.logistics_OptimizationConfig.deleteMany({});
  await prisma.logistics_VehicleTariff.deleteMany({ where: { vehicleId: vehicle.id } });
  await prisma.logistics_Vehicle.deleteMany({ where: { id: vehicle.id } });
  console.log('cleanup done');

  const ok = result.options.length >= 3
    && result.options.some(o => o.optionType === 'CUSTOMER_PICKUP' && o.buyerPriceTzs === 0)
    && result.options.some(o => o.optionType === 'MAYSAR_SHARED')
    && result.options.some(o => o.optionType === 'MAYSAR_EXPRESS')
    && activeConfig !== null;
  console.log(ok ? 'VERIFY: PASS' : 'VERIFY: FAIL');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
