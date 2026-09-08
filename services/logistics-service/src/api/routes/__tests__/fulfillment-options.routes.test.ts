/**
 * Fulfillment-options endpoint e2e test (Phase 4 §4.1)
 *
 * Mounts the real publicQuoteRouter (which now includes /fulfillment-options)
 * over supertest with a fake (globalThis).prisma covering the tariff + config
 * repos, mocks @shared auth to passthrough, and asserts the endpoint returns
 * ranked options / structured exclusions.
 */

import express from 'express';
import request from 'supertest';
import { publicQuoteRouter } from '../quote.routes';
import { VehicleTariff } from '../../../domain/entities/vehicle-tariff.entity';
import { OptimizationConfig } from '../../../domain/value-objects/optimization-config.value-object';


jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

// Fake the two repos the use case reads.
beforeAll(() => {
  const tariff = VehicleTariff.create({
    vehicleId: 'VHL_1',
    baseOperatingCostTzs: 2000,
    costPerKmTzs: 500,
    costPerHourTzs: 12000,
    minimumJobCompensationTzs: 6000,
    loadingFeeTzs: 300,
    unloadingFeeTzs: 200,
    waitingRateTzsPerMinute: 50,
    freeWaitMinutes: 5,
  });
  const config = OptimizationConfig.create({ weights: OptimizationConfig.defaultWeights() });

  (globalThis as any).prisma = {
    logistics_VehicleTariff: {
      findFirst: async () => ({
        id: tariff.id,
        vehicleId: tariff.vehicleId,
        version: tariff.version,
        baseOperatingCostTzs: tariff.baseOperatingCostTzs,
        costPerKmTzs: tariff.costPerKmTzs,
        costPerHourTzs: tariff.costPerHourTzs,
        minimumJobCompensationTzs: tariff.minimumJobCompensationTzs,
        loadingFeeTzs: tariff.loadingFeeTzs,
        unloadingFeeTzs: tariff.unloadingFeeTzs,
        waitingRateTzsPerMinute: tariff.waitingRateTzsPerMinute,
        freeWaitMinutes: tariff.freeWaitMinutes,
        isActive: true,
        effectiveFrom: new Date(),
        createdAt: new Date(),
      }),
    },
    logistics_OptimizationConfig: {
      findFirst: async () => {
        const d = config.toData();
        return {
          version: d.version,
          buyerCostWeight: d.buyerCostWeight,
          deliveryTimeWeight: d.deliveryTimeWeight,
          vehicleUtilizationWeight: d.vehicleUtilizationWeight,
          failureRiskWeight: d.failureRiskWeight,
          driverEfficiencyWeight: d.driverEfficiencyWeight,
          maysarMarginWeight: d.maysarMarginWeight,
          maysarAbsorbsUpToTzs: d.maysarAbsorbsUpToTzs,
          customerChargeableVarianceTypes: d.customerChargeableVarianceTypes,
          isActive: true,
        };
      },
    },
  };
});

afterAll(() => {
  delete (globalThis as any).prisma;
});

const app = express();
app.use(express.json());
app.use('/v1', publicQuoteRouter);

describe('POST /v1/fulfillment-options', () => {
  it('returns ranked options + weights for a valid request', async () => {
    const response = await request(app)
      .post('/v1/fulfillment-options')
      .send({
        masterOrderId: 'mos_1',
        buyerDestination: { lat: -6.7924, lng: 39.2083, address: 'City centre' },
        deliveryWindowPreference: 'FLEXIBLE',
        shipments: [
          { shipmentId: 'SHP_1', sellerId: 's1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 2, pickupEligible: true },
          { shipmentId: 'SHP_2', sellerId: 's2', pickupLat: -6.78, pickupLng: 39.28, pickupAddress: 'Masaki', packageWeightKg: 1.5, pickupEligible: true },
        ],
        buyerTrustTier: 'TRUSTED_BUYER',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const { options, exclusions, weights } = response.body.data;
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    // Options are sorted by score desc.
    for (let i = 1; i < options.length; i++) {
      expect(options[i - 1].score).toBeGreaterThanOrEqual(options[i].score);
    }
    expect(options[0].buyerPriceTzs).toBeGreaterThanOrEqual(0);
    expect(weights.version).toBe(1);
    expect(weights.buyerCostWeight).toBeGreaterThan(0);
    expect(Array.isArray(exclusions)).toBe(true);
  });

  it('applies the capacity hard gate (35 kg total > 30 kg capacity) so no Maysar option is offered', async () => {
    const response = await request(app)
      .post('/v1/fulfillment-options')
      .send({
        buyerDestination: { lat: -3.3869, lng: 36.683, address: 'Arusha' },
        shipments: [
          { shipmentId: 'SHP_1', sellerId: 's1', pickupLat: -6.77, pickupLng: 39.27, pickupAddress: 'Mikocheni', packageWeightKg: 20, pickupEligible: true },
          { shipmentId: 'SHP_2', sellerId: 's2', pickupLat: -6.78, pickupLng: 39.28, pickupAddress: 'Masaki', packageWeightKg: 15, pickupEligible: true },
        ],
        buyerTrustTier: 'NEW_BUYER', // 35 kg total > 30kg capacity
      });
    expect(response.status).toBe(200);
    const { options } = response.body.data;
    // Capacity hard gate: no Maysar-fulfilled option for 35kg.
    expect(options.some((o: any) => o.optionType === 'MAYSAR_EXPRESS')).toBe(false);
  });
});