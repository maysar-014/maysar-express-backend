/**
 * RequestDeliveryQuoteUseCase — end-to-end acceptance tests
 *
 * Exercises the full quote pipeline with REAL domain components
 * (DeliveryPricingEngine, ZoneClassifier, CourierCostCalculator, PricingConfig)
 * and fake ports (RoutingProvider, repositories). This is the domain-level
 * equivalent of the spec acceptance test (delivery-pricing-engine task 11):
 *
 *   POST /api/logistics/v1/quote with valid Dar es Salaam coordinates returns
 *   HTTP 200 with quoteId, status: ACTIVE, deliveryFee > 0, pricingVersion
 *   matching the active config, and a full breakdown.
 *
 * The HTTP layer (supertest over the public/internal quote routers) is covered
 * separately in src/api/routes/quote.routes.test.ts.
 */

import { RequestDeliveryQuoteUseCase, DeliveryQuoteRequest } from '../request-delivery-quote.use-case';
import { DeliveryPricingEngine, PricingBreakdown } from '../../../domain/engines/delivery-pricing.engine';
import { CourierCostCalculator } from '../../../domain/engines/courier-cost-calculator';
import { ZoneClassifier } from '../../../domain/services/zone-classifier';
import { RoutingProviderPort, RoutingResult } from '../../../domain/engines/ports/routing-provider.port';
import { QuoteRepository } from '../../../domain/repositories/quote.repository';
import { PricingConfigRepository } from '../../../domain/repositories/pricing-config.repository';
import { PricingAuditRecordRepository } from '../../../domain/repositories/pricing-audit-record.repository';
import { Quote } from '../../../domain/entities/quote.entity';
import { PricingAuditRecord } from '../../../domain/entities/pricing-audit-record.entity';
import { PricingConfig, PricingConfigData } from '../../../domain/value-objects/pricing-config.value-object';

// ─── Test config factory (matches seed-pricing-config.ts v2 calibration) ─────

function makeActiveConfig(overrides?: Partial<PricingConfigData>): PricingConfig {
  const data: PricingConfigData = {
    version: 2,
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
    ...overrides,
  };
  return PricingConfig.fromPersisted(data);
}

// ─── In-memory fakes ─────────────────────────────────────────────────────────

class FakeQuoteRepository implements QuoteRepository {
  readonly store = new Map<string, Quote>();

  async save(quote: Quote): Promise<void> {
    this.store.set(quote.quoteId, quote);
  }

  async findById(quoteId: string): Promise<Quote | null> {
    return this.store.get(quoteId) ?? null;
  }

  async markConsumed(quoteId: string): Promise<void> {
    const quote = this.store.get(quoteId);
    if (quote) quote.markConsumed();
  }

  async markExpired(quoteId: string): Promise<void> {
    const quote = this.store.get(quoteId);
    if (quote) {
      this.store.set(quoteId, new Quote({ ...quote.toData(), status: 'EXPIRED' }));
    }
  }
}

class FakePricingConfigRepository implements PricingConfigRepository {
  constructor(private readonly config: PricingConfig) {}

  async getActive(): Promise<PricingConfig> {
    return this.config;
  }

  async getByVersion(version: number): Promise<PricingConfig | null> {
    return this.config.version === version ? this.config : null;
  }

  async save(): Promise<void> { /* no-op */ }

  async getNextVersion(): Promise<number> {
    return this.config.version + 1;
  }
}

class FakeAuditRecordRepository implements PricingAuditRecordRepository {
  readonly records: PricingAuditRecord[] = [];

  async save(record: PricingAuditRecord): Promise<void> {
    this.records.push(record);
  }

  async findByQuoteId(quoteId: string): Promise<PricingAuditRecord | null> {
    return this.records.find(r => r.quoteId === quoteId) ?? null;
  }
}

class StubRoutingProvider implements RoutingProviderPort {
  constructor(private readonly result: RoutingResult) {}

  async getRoute(): Promise<RoutingResult> {
    return this.result;
  }
}

// ─── Harness ─────────────────────────────────────────────────────────────────

interface Harness {
  useCase: RequestDeliveryQuoteUseCase;
  quoteRepo: FakeQuoteRepository;
  auditRepo: FakeAuditRecordRepository;
  config: PricingConfig;
}

function createHarness(options?: {
  route?: RoutingResult;
  config?: PricingConfig;
}): Harness {
  const config = options?.config ?? makeActiveConfig();
  const route = options?.route ?? { distanceKm: 8, durationMinutes: 25, source: 'fallback' };

  const quoteRepo = new FakeQuoteRepository();
  const auditRepo = new FakeAuditRecordRepository();

  const useCase = new RequestDeliveryQuoteUseCase(
    new DeliveryPricingEngine(),
    new CourierCostCalculator(),
    new ZoneClassifier(),
    new StubRoutingProvider(route),
    quoteRepo,
    new FakePricingConfigRepository(config),
    auditRepo,
  );

  return { useCase, quoteRepo, auditRepo, config };
}

function darEsSalaamRequest(): DeliveryQuoteRequest {
  return {
    originLat: -6.8197,
    originLng: 39.2805,
    originAddress: 'Kariakoo, Dar es Salaam',
    destinationLat: -6.8000,
    destinationLng: 39.2500,
    destinationAddress: 'Mikocheni, Dar es Salaam',
    packageWeightKg: 0.5,
    isCoD: false,
  };
}
// ─── Acceptance tests ────────────────────────────────────────────────────────

describe('RequestDeliveryQuoteUseCase — acceptance (valid Dar es Salaam route)', () => {
  test('returns ACTIVE quote with quoteId, deliveryFee > 0, matching pricingVersion and full breakdown', async () => {
    const { useCase, config } = createHarness();

    const response = await useCase.execute(darEsSalaamRequest());

    expect(response.quoteId).toBeDefined();
    expect(response.status).toBe('ACTIVE');
    expect(response.deliveryFee).toBeGreaterThan(0);
    expect(response.pricingVersion).toBe(config.version);
    expect(response.currency).toBe('TZS');
    expect(response.breakdown).not.toBeNull();

    const b = response.breakdown! as PricingBreakdown;
    // v2 breakdown contains every cost component, margin, and clamp/rounding stages
    for (const key of [
      'deliveryStrategy',
      'distanceBandCost',
      'weightSurcharge',
      'peakSurcharge',
      'fulfillmentCost',
      'platformMarginPct',
      'platformMarginAmount',
      'preAdjustmentFee',
      'codCharge',
      'floorPrice',
      'ceilingPrice',
      'postClampFee',
      'roundingIncrement',
      'roundingAdjustment',
      'finalFee',
      'routeSource',
      'pricingVersion',
    ]) {
      expect(b).toHaveProperty(key);
    }

    // Financial integrity: final fee = fulfillment + margin (+ COD), never a silent loss
    expect(b.finalFee).toBe(response.deliveryFee);
    expect(b.isProfitable).toBe(true);
    expect(b.financialNote).toContain('PROFITABLE');
    // round-up to nearest roundingIncrementTzs
    expect(b.finalFee % b.roundingIncrement).toBe(0);
  });

  test('persists the quote in the repository as ACTIVE', async () => {
    const { useCase, quoteRepo } = createHarness();

    const response = await useCase.execute(darEsSalaamRequest());
    const saved = quoteRepo.store.get(response.quoteId);

    expect(saved).toBeDefined();
    expect(saved!.status).toBe('ACTIVE');
    expect(saved!.deliveryFee).toBeGreaterThan(0);
    expect(saved!.isExpired).toBe(false);
  });

  test('persists a PricingAuditRecord carrying pricingVersion and route metadata', async () => {
    const { useCase, auditRepo, config } = createHarness();

    const response = await useCase.execute(darEsSalaamRequest());

    expect(auditRepo.records).toHaveLength(1);
    const audit = auditRepo.records[0];
    expect(audit.quoteId).toBe(response.quoteId);
    expect(audit.pricingVersion).toBe(config.version);
    expect(audit.buyerDeliveryFee).toBe(response.deliveryFee);
    expect(audit.distanceKm).toBe(8);
    expect(audit.durationMinutes).toBe(25);
    expect(audit.deliveryZone).not.toBeNull();
  });

  test('repeated requests produce different quoteIds', async () => {
    const { useCase } = createHarness();

    const first = await useCase.execute(darEsSalaamRequest());
    const second = await useCase.execute(darEsSalaamRequest());

    expect(first.quoteId).not.toBe(second.quoteId);
  });

  test('a COD order includes the configured flat COD charge in the fee', async () => {
    const { useCase } = createHarness();

    const nonCod = await useCase.execute(darEsSalaamRequest());
    const cod = await useCase.execute({ ...darEsSalaamRequest(), isCoD: true, itemValueTzs: 50000 });

    expect(cod.status).toBe('ACTIVE');
    expect(cod.deliveryFee).toBeGreaterThan(nonCod.deliveryFee as number);
    expect((cod.breakdown! as PricingBreakdown).codCharge).toBe(500); // fixedChargeTzs from config
  });

  test('quote validity window comes from the loaded config', async () => {
    const { useCase } = createHarness({ config: makeActiveConfig({ quoteValiditySeconds: 600 }) });

    const before = Date.now();
    const response = await useCase.execute(darEsSalaamRequest());
    const expiryMs = new Date(response.expiresAt).getTime();

    expect(expiryMs).toBeGreaterThanOrEqual(before + 600000 - 1000);
    expect(expiryMs).toBeLessThanOrEqual(Date.now() + 600000 + 1000);
  });
});

describe('RequestDeliveryQuoteUseCase — DELIVERY_UNAVAILABLE paths', () => {
  test('unserved intercity route (no configured corridor) returns DELIVERY_UNAVAILABLE and is persisted', async () => {
    // Config intentionally has no corridors and no fallback: an intercity route
    // must be refused, never priced.
    const { useCase, quoteRepo } = createHarness({
      route: { distanceKm: 300, durationMinutes: 360, source: 'live' },
    });

    const response = await useCase.execute({
      originLat: -6.8197,
      originLng: 39.2805,
      originAddress: 'Kariakoo, Dar es Salaam',
      destinationLat: -3.3667,
      destinationLng: 36.6833,
      destinationAddress: 'Sekei, Arusha',
      packageWeightKg: 1,
      isCoD: false,
    });

    expect(response.status).toBe('DELIVERY_UNAVAILABLE');
    expect(response.deliveryFee).toBeNull();
    expect(response.breakdown).toBeNull();
    expect(response.unavailableReason).toMatch(/No delivery corridor/i);

    const saved = quoteRepo.store.get(response.quoteId);
    expect(saved).toBeDefined();
    expect(saved!.status).toBe('DELIVERY_UNAVAILABLE');
  });
});