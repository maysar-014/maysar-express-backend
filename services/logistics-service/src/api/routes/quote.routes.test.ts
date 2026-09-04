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