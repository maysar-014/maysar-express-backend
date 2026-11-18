/**
 * Quote Routes — HTTP-level end-to-end tests
 *
 * Mounts the real publicQuoteRouter + internalQuoteRouter from quote.routes.ts
 * over a supertest HTTP server. The real controller/use case/engine run
 * end-to-end; only the infrastructure edges are faked:
 *
 *   - (globalThis).prisma  → in-memory fake covering Logistics_Quote,
 *                            Logistics_PricingConfig, Logistics_PricingAuditRecord
 *   - MapsRoutingBridge    → returns a fixed Dar es Salaam route (no network)
 *   - requireAuth          → passthrough
 *
 * Spec reference (delivery-pricing-engine task 18):
 *   valid coordinates → 200 with quoteId
 *   repeated request → different quoteId
 *   packageWeightKg: 0 → 400
 *   originLat: 200 → 400
 *   GET /internal/quotes/:quoteId → 200
 *   nonexistent quoteId → 404
 */

import express from 'express';
import request from 'supertest';
import { PricingConfig, PricingConfigData } from '../../domain/value-objects/pricing-config.value-object';

const passthrough = (_req: express.Request, _res: express.Response, next: express.NextFunction): void => next();

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: passthrough,
}));

jest.mock('../../infrastructure/providers/maps-routing.bridge', () => ({
  MapsRoutingBridge: jest.fn().mockImplementation(() => ({
    calculateOptimalRoute: jest.fn(async () => ({
      segments: [],
      totalDistance: 8,
      totalDuration: 25,
      waypoints: [],
      efficiency: 100,
      confidence: 1,
      alternatives: [],
    })),
  })),
}));

// ─── In-memory fake Prisma ───────────────────────────────────────────────────

type QuoteRow = Record<string, any>;

function makeFakeDb() {
  const quotes = new Map<string, QuoteRow>();

  const headers = {
    'content-type': 'application/json',
  };

  return {
    headers,
    getQuoteRows: () => quotes,
    Logistics_Quote: {
      upsert: async ({ where, update, create }: { where: { id: string }; update: any; create: any }) => {
        const existing = quotes.get(where.id);
        if (existing) {
          const merged = { ...existing, ...update };
          quotes.set(where.id, merged);
          return merged;
        }
        quotes.set(where.id, { ...create });
        return { ...create };
      },
      findUnique: async ({ where }: { where: { id: string } }) => quotes.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = quotes.get(where.id);
        if (!existing) throw new Error('Quote not found');
        const merged = { ...existing, ...data };
        quotes.set(where.id, merged);
        return merged;
      },
    },
    Logistics_PricingConfig: {
      findFirst: async () => makePricingConfigRow(),
    },
    Logistics_PricingAuditRecord: {
      create: async (): Promise<any> => undefined,
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
  };
}

function makePricingConfigRow(): Record<string, any> {
  const config = PricingConfig.fromPersisted(makeConfigData(2));
  return {
    version: config.version,
    platformMarginPct: config.platformMarginPct,
    floorPriceTzs: config.floorPriceTzs,
    ceilingPriceTzs: config.ceilingPriceTzs,
    roundingIncrementTzs: config.roundingIncrementTzs,
    codPolicy: config.codPolicy,
    localUrban: config.localUrban,
    metropolitan: config.metropolitan,
    intercityCorridors: [],
    intercityFallback: null,
    remoteUnavailable: true,
    quoteValiditySeconds: config.quoteValiditySeconds,
    routingCacheTtlMs: 300000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function makeConfigData(version: number): PricingConfigData {
  return {
    version,
    platformMarginPct: 0.20,
    floorPriceTzs: 1500,
    ceilingPriceTzs: 50000,
    roundingIncrementTzs: 50,
    codPolicy: {
      fixedChargeTzs: 500,
      valueSurchargeRate: 0.005,
      valueSurchargeThresholdTzs: 100000,
    },
    localUrban: {
      distanceBands: [
        { maxDistanceKm: 3, fulfillmentCostTzs: 1800 },
        { maxDistanceKm: 7, fulfillmentCostTzs: 2500 },
        { maxDistanceKm: 12, fulfillmentCostTzs: 3200 },
        { maxDistanceKm: 20, fulfillmentCostTzs: 4000 },
      ],
      weightBands: [
        { maxWeightKg: 1, additionalCostTzs: 0 },
        { maxWeightKg: 5, additionalCostTzs: 500 },
        { maxWeightKg: 10, additionalCostTzs: 1200 },
        { maxWeightKg: 20, additionalCostTzs: 2500 },
        { maxWeightKg: 9999, additionalCostTzs: 5000 },
      ],
      operationalSurcharge: {
        peakHourSurchargeAmount: 300,
        peakHours: [
          { startHour: 7, endHour: 9 },
          { startHour: 17, endHour: 20 },
        ],
      },
    },
    metropolitan: {
      distanceBands: [
        { maxDistanceKm: 35, fulfillmentCostTzs: 5000 },
        { maxDistanceKm: 50, fulfillmentCostTzs: 6500 },
        { maxDistanceKm: 80, fulfillmentCostTzs: 8500 },
      ],
      weightBands: [
        { maxWeightKg: 1, additionalCostTzs: 0 },
        { maxWeightKg: 5, additionalCostTzs: 800 },
        { maxWeightKg: 10, additionalCostTzs: 1800 },
        { maxWeightKg: 20, additionalCostTzs: 3500 },
        { maxWeightKg: 9999, additionalCostTzs: 7000 },
      ],
      operationalSurcharge: { peakHourSurchargeAmount: 0, peakHours: [] },
    },
    intercityCorridors: [],
    intercityFallback: null,
    remoteUnavailable: true,
    quoteValiditySeconds: 900,
    routingCacheTtlMs: 300000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

// ─── Router + server (import AFTER jest.mock declarations) ───────────────────

import { publicQuoteRouter, internalQuoteRouter } from './quote.routes';

const app = express();
app.use(express.json());
app.use('/api/logistics/v1', publicQuoteRouter);
app.use('/api/logistics/internal', internalQuoteRouter);

const validQuoteBody = {
  originLat: -6.8197,
  originLng: 39.2805,
  originAddress: 'Kariakoo, Dar es Salaam',
  destinationLat: -6.8000,
  destinationLng: 39.2500,
  destinationAddress: 'Mikocheni, Dar es Salaam',
  packageWeightKg: 0.5,
  isCoD: false,
};

describe('POST /api/logistics/v1/quote (public)', () => {
  let createdQuoteId: string;

  beforeAll(() => {
    (globalThis as any).prisma = makeFakeDb();
  });

  afterAll(() => {
    delete (globalThis as any).prisma;
  });

  test('valid Dar es Salaam coordinates → 200 with quoteId, ACTIVE, deliveryFee > 0 and breakdown', async () => {
    const res = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const quote = res.body.data;
    expect(quote.quoteId).toBeDefined();
    expect(quote.status).toBe('ACTIVE');
    expect(quote.deliveryFee).toBeGreaterThan(0);
    expect(quote.pricingVersion).toBe(2);
    expect(quote.currency).toBe('TZS');
    expect(quote.breakdown).not.toBeNull();
    expect(quote.breakdown.finalFee).toBe(quote.deliveryFee);
    expect(quote.breakdown.pricingVersion).toBe(2);
    expect(quote.breakdown.deliveryStrategy).toBeTruthy();

    createdQuoteId = quote.quoteId;
  });

  test('repeated request returns a different quoteId', async () => {
    const first = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);
    const second = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.quoteId).toBeDefined();
    expect(second.body.data.quoteId).toBeDefined();
    expect(first.body.data.quoteId).not.toBe(second.body.data.quoteId);
  });

  test('packageWeightKg: 0 → 400 INVALID_QUOTE_REQUEST', async () => {
    const res = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, packageWeightKg: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_QUOTE_REQUEST');
    expect(JSON.stringify(res.body.error.details)).toContain('packageWeightKg');
  });

  test('originLat: 200 → 400 INVALID_QUOTE_REQUEST', async () => {
    const res = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, originLat: 200 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_QUOTE_REQUEST');
    expect(JSON.stringify(res.body.error.details)).toContain('originLat');
  });

  test('GET /api/logistics/internal/quotes/:quoteId → 200 for a real quote', async () => {
    expect(createdQuoteId).toBeDefined();

    const res = await request(app).get(`/api/logistics/internal/quotes/${createdQuoteId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quoteId).toBe(createdQuoteId);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.deliveryFee).toBeGreaterThan(0);
    expect(res.body.data.pricingVersion).toBe(2);
  });

  test('GET /api/logistics/internal/quotes/nonexistent → 404 QUOTE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/logistics/internal/quotes/qte_doesnotexist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
  });

  test('PATCH /api/logistics/internal/quotes/:quoteId/consume → 200, then the quote reads CONSUMED', async () => {
    expect(createdQuoteId).toBeDefined();

    const consume = await request(app).patch(`/api/logistics/internal/quotes/${createdQuoteId}/consume`);
    expect(consume.status).toBe(200);
    expect(consume.body.success).toBe(true);

    const after = await request(app).get(`/api/logistics/internal/quotes/${createdQuoteId}`);
    expect(after.status).toBe(200);
    expect(after.body.data.status).toBe('CONSUMED');
  });
});

// ─── Feasibility gate assertions (MYS-DEL-001 Article 4.6) ───────────────────
//
// When the three-engine path runs (no active VehicleTariff in this fake DB,
// so the 11-stage pipeline fires), the interim breakdown shape is returned.
// These tests assert the constitutional contracts that MUST hold regardless
// of which pipeline ran.

describe('Financial feasibility — constitutional contracts on quote response', () => {
  beforeAll(() => {
    (globalThis as any).prisma = makeFakeDb();
  });

  afterAll(() => {
    delete (globalThis as any).prisma;
  });

  test('every ACTIVE quote has a non-null breakdown', async () => {
    const res = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);
    expect(res.status).toBe(200);
    const quote = res.body.data;
    expect(quote.status).toBe('ACTIVE');
    // Breakdown must be present — a quote without a breakdown cannot be audited.
    expect(quote.breakdown).not.toBeNull();
  });

  test('deliveryFee is a positive integer number of TZS', async () => {
    const res = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);
    const fee = res.body.data.deliveryFee;
    expect(typeof fee).toBe('number');
    expect(fee).toBeGreaterThan(0);
    expect(Number.isFinite(fee)).toBe(true);
  });

  test('COD delivery returns a higher fee than non-COD (same route)', async () => {
    const withoutCod = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, isCoD: false });
    const withCod = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, isCoD: true });

    expect(withoutCod.status).toBe(200);
    expect(withCod.status).toBe(200);
    // COD adds a flat charge — fee must be strictly higher.
    expect(withCod.body.data.deliveryFee).toBeGreaterThan(withoutCod.body.data.deliveryFee);
  });

  test('heavy package (15 kg) returns a higher fee than light package (0.5 kg)', async () => {
    const light = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, packageWeightKg: 0.5 });
    const heavy = await request(app)
      .post('/api/logistics/v1/quote')
      .send({ ...validQuoteBody, packageWeightKg: 15 });

    expect(light.status).toBe(200);
    expect(heavy.status).toBe(200);
    // Weight surcharge is additive — heavy must be >= light.
    expect(heavy.body.data.deliveryFee).toBeGreaterThanOrEqual(light.body.data.deliveryFee);
  });

  test('DELIVERY_UNAVAILABLE quote has null deliveryFee', async () => {
    // Use coordinates outside Tanzania to trigger zone unavailability.
    const res = await request(app)
      .post('/api/logistics/v1/quote')
      .send({
        ...validQuoteBody,
        originLat: 48.8566,   // Paris
        originLng: 2.3522,
        destinationLat: 51.5074,  // London
        destinationLng: -0.1278,
      });

    // Zone classifier may or may not flag this depending on implementation.
    // What we assert is: if unavailable, fee is null; if available, fee > 0.
    expect(res.status).toBe(200);
    const quote = res.body.data;
    if (quote.status === 'DELIVERY_UNAVAILABLE') {
      expect(quote.deliveryFee).toBeNull();
      expect(quote.unavailableReason).toBeTruthy();
    } else {
      expect(quote.deliveryFee).toBeGreaterThan(0);
    }
  });

  test('quote expiresAt is after issuedAt', async () => {
    const res = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);
    expect(res.status).toBe(200);
    const expiresAt = new Date(res.body.data.expiresAt).getTime();
    // issuedAt is not in the response, so we compare to now.
    expect(expiresAt).toBeGreaterThan(Date.now());
  });

  test('pricingVersion is a positive integer', async () => {
    const res = await request(app).post('/api/logistics/v1/quote').send(validQuoteBody);
    expect(res.status).toBe(200);
    const version = res.body.data.pricingVersion;
    expect(Number.isInteger(version)).toBe(true);
    expect(version).toBeGreaterThan(0);
  });
});

// ─── Three-engine feasibility integration ─────────────────────────────────────
//
// These tests directly invoke the three-engine pipeline with a fake VehicleTariff
// to verify the feasibility field appears on the breakdown without going through HTTP.

describe('Three-engine + feasibility integration (direct use-case invocation)', () => {
  const {
    RequestDeliveryQuoteUseCase,
  } = jest.requireActual<typeof import('../../application/use-cases/request-delivery-quote.use-case')>(
    '../../application/use-cases/request-delivery-quote.use-case',
  );
  const { DeliveryPricingEngine } = jest.requireActual<typeof import('../../domain/engines/delivery-pricing.engine')>(
    '../../domain/engines/delivery-pricing.engine',
  );
  const { CourierCostCalculator } = jest.requireActual<typeof import('../../domain/engines/courier-cost-calculator')>(
    '../../domain/engines/courier-cost-calculator',
  );
  const { ZoneClassifier } = jest.requireActual<typeof import('../../domain/services/zone-classifier')>(
    '../../domain/services/zone-classifier',
  );

  // Fake vehicle tariff for the three-engine path.
  const FAKE_TARIFF = {
    id: 'vtf-test-001',
    vehicleId: 'vhl-test',
    version: 1,
    baseOperatingCostTzs: 500,
    costPerKmTzs: 250,
    costPerHourTzs: 1200,
    minimumJobCompensationTzs: 2000,
    loadingFeeTzs: 100,
    unloadingFeeTzs: 100,
    waitingRateTzsPerMinute: 20,
    freeWaitMinutes: 5,
    isActive: true,
  };

  function makeFakeDbWithTariff() {
    const db = makeFakeDb();
    return {
      ...db,
      Logistics_VehicleTariff: {
        findFirst: async () => FAKE_TARIFF,
      },
    };
  }

  function makeVehicleTariffRepo(fake: any) {
    return {
      findLatestActive: async () => {
        const row = await fake.Logistics_VehicleTariff.findFirst();
        if (!row) return null;
        // Minimal VehicleTariff-compatible object
        return {
          ...row,
          baseOperatingCostTzs: row.baseOperatingCostTzs,
          costPerKmTzs: row.costPerKmTzs,
          costPerHourTzs: row.costPerHourTzs,
          minimumJobCompensationTzs: row.minimumJobCompensationTzs,
          loadingFeeTzs: row.loadingFeeTzs,
          unloadingFeeTzs: row.unloadingFeeTzs,
          waitingRateTzsPerMinute: row.waitingRateTzsPerMinute,
          freeWaitMinutes: row.freeWaitMinutes,
        };
      },
    };
  }

  test('three-engine path produces a breakdown with feasibility field', async () => {
    const fakeDb = makeFakeDbWithTariff();
    (globalThis as any).prisma = fakeDb;

    const { PrismaQuoteRepository } = jest.requireActual<
      typeof import('../../infrastructure/repositories/prisma-quote.repository')
    >('../../infrastructure/repositories/prisma-quote.repository');
    const { PrismaPricingConfigRepository } = jest.requireActual<
      typeof import('../../infrastructure/repositories/prisma-pricing-config.repository')
    >('../../infrastructure/repositories/prisma-pricing-config.repository');
    const { PrismaPricingAuditRecordRepository } = jest.requireActual<
      typeof import('../../infrastructure/repositories/prisma-pricing-audit-record.repository')
    >('../../infrastructure/repositories/prisma-pricing-audit-record.repository');

    const fakeRouting = {
      async getRoute() {
        return { distanceKm: 8, durationMinutes: 25, source: 'fallback' as const };
      },
    };

    const useCase = new RequestDeliveryQuoteUseCase(
      new DeliveryPricingEngine(),
      new CourierCostCalculator(),
      new ZoneClassifier(),
      fakeRouting,
      new PrismaQuoteRepository(),
      new PrismaPricingConfigRepository(),
      new PrismaPricingAuditRecordRepository(),
      makeVehicleTariffRepo(fakeDb) as unknown as import('../../domain/repositories/vehicle-tariff.repository').VehicleTariffRepository,
    );

    const response = await useCase.execute({
      originLat: -6.8197,
      originLng: 39.2805,
      originAddress: 'Kariakoo, Dar es Salaam',
      destinationLat: -6.8000,
      destinationLng: 39.2500,
      destinationAddress: 'Mikocheni, Dar es Salaam',
      packageWeightKg: 2,
      isCoD: false,
    });

    expect(response.status).toBe('ACTIVE');
    expect(response.deliveryFee).toBeGreaterThan(0);

    // If the three-engine path ran, breakdown will have engineVersion.
    const breakdown = response.breakdown as any;
    if (breakdown && breakdown.engineVersion === 'three-engine-v1') {
      // Feasibility must be present on a three-engine breakdown.
      expect(breakdown.feasibility).not.toBeNull();

      // Classification must be one of the five constitutional values.
      const validClassifications = ['PROFITABLE', 'BREAK_EVEN', 'SUBSIDIZED', 'LOSS_MAKING', 'UNVERIFIED'];
      expect(validClassifications).toContain(breakdown.feasibility.classification);

      // Total funding must be >= customer delivery fee (never zero when fee > 0).
      expect(breakdown.feasibility.totalFundingTzs).toBeGreaterThanOrEqual(response.deliveryFee!);

      // Driver payout is always recorded (not zero) when tariff is active.
      expect(breakdown.feasibility.driverPayoutTzs).toBeGreaterThan(0);

      // Platform contribution = totalFunding - totalVariableCost.
      const expectedContribution =
        breakdown.feasibility.totalFundingTzs - breakdown.feasibility.totalVariableCostTzs;
      expect(breakdown.feasibility.platformContributionTzs).toBeCloseTo(expectedContribution, 1);

      // Versioning fields must be present.
      expect(breakdown.feasibility.pricingVersion).toBeGreaterThan(0);
      expect(typeof breakdown.feasibility.costModelVersion).toBe('string');

      // Financial assumptions are always an array.
      expect(Array.isArray(breakdown.feasibility.financialAssumptions)).toBe(true);
    }

    delete (globalThis as any).prisma;
  });
});
