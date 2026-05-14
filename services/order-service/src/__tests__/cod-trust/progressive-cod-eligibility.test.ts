/**
 * Unit and Integration Tests — ProgressiveCODEligibilityEngine
 *
 * Requirements: 5.1–5.6, 6.1–6.7, 8.1–8.5, 10.1–10.4
 *
 * @jest-environment node
 */

// Mock saga repository to prevent DB connection attempts (same pattern as other order-service tests)
jest.mock('../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: {
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    saveStep: jest.fn().mockResolvedValue(undefined),
    updateStep: jest.fn().mockResolvedValue(undefined),
    getSteps: jest.fn().mockResolvedValue([]),
    findStuck: jest.fn().mockResolvedValue([]),
  },
}));

// Mock the database manager to prevent connection attempts
jest.mock('../../config/database.config', () => ({
  databaseManager: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getPrisma: jest.fn().mockReturnValue({}),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({ prisma: true }),
  },
  loadDatabaseConfig: jest.fn().mockReturnValue({}),
}));

// Mock PrismaClient to prevent integration setup from connecting to real DB
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn((cb: any) => cb({})),
  })),
}));

import { ProgressiveCODEligibilityEngine } from '../../domain/engines/progressive-cod-eligibility.engine';
import { ICODTrustScoreRepository } from '../../domain/repositories/cod-trust-score.repository';
import { ICODRestrictionRepository } from '../../domain/repositories/cod-restriction.repository';
import { TrustTier, TrustScoreRecord, RestrictionRecord } from '../../domain/engines/cod-trust/trust-signal.types';
import { Order } from '../../domain/entities/order.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScoreRepo(score: number, tier: TrustTier): ICODTrustScoreRepository {
  const record: TrustScoreRecord = {
    buyerId: 'buyer-001',
    score,
    tier,
    updatedAt: new Date(),
    createdAt: new Date(),
  };
  return {
    findByBuyerId: jest.fn().mockResolvedValue(record),
    upsert: jest.fn().mockResolvedValue(record),
  };
}

function makeEmptyScoreRepo(): ICODTrustScoreRepository {
  return {
    findByBuyerId: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
  };
}

function makeRestrictionRepo(restrictions: Partial<RestrictionRecord>[] = []): ICODRestrictionRepository {
  const full: RestrictionRecord[] = restrictions.map((r, i) => ({
    id: `restriction-${i}`,
    buyerId: 'buyer-001',
    reason: r.reason ?? 'Test restriction',
    startAt: r.startAt ?? new Date(),
    endsAt: r.endsAt ?? new Date(Date.now() + 3600_000),
    permanent: r.permanent ?? false,
    createdAt: new Date(),
  }));
  return {
    findActiveByBuyerId: jest.fn().mockResolvedValue(full),
    save: jest.fn(),
    extendRestriction: jest.fn(),
  };
}

function makeEmptyRestrictionRepo(): ICODRestrictionRepository {
  return {
    findActiveByBuyerId: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    extendRestriction: jest.fn(),
  };
}

function makeOrderRepo(activeCODOrders: number = 0) {
  const orders = Array.from({ length: activeCODOrders }, (_, i) => ({
    id: `order-${i}`,
    buyerId: 'buyer-001',
    paymentMethod: 'COD',
    status: 'pending',
  }));
  return {
    findByBuyerId: jest.fn().mockResolvedValue(orders),
    save: jest.fn(),
    findById: jest.fn(),
    findByTrackingNumber: jest.fn(),
    findByStatus: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
}

function makeAuthService(verified = true) {
  return { isUserVerified: jest.fn().mockResolvedValue(verified) };
}

function makeLogisticsService(supported = true) {
  return {
    isCODSupportedInArea: jest.fn().mockResolvedValue(supported),
    isCrossRegionDelivery: jest.fn().mockResolvedValue(false),
  };
}

function makeOrder(overrides: Partial<{
  buyerId: string;
  totalAmount: number;
  deliveryCity: string;
  paymentMethod: string;
  items: any[];
}> = {}): Order {
  return new Order({
    id: 'ord-test-001',
    buyerId: overrides.buyerId ?? 'buyer-001',
    sellerId: 'seller-001',
    paymentMethod: overrides.paymentMethod ?? 'COD',
    totalAmount: overrides.totalAmount ?? 5000,
    currency: 'TZS',
    totalWeight: 1,
    deliveryAddress: {
      street: '1 Main St',
      city: overrides.deliveryCity ?? 'Dar es Salaam',
      postalCode: '11101',
      country: 'Tanzania',
    },
    items: overrides.items ?? [{ productId: 'prod-001', quantity: 1, price: { amount: overrides.totalAmount ?? 5000, currency: 'TZS' }, weight: 1 }],
  });
}

function makeEngine(opts: {
  score?: number;
  tier?: TrustTier;
  restrictions?: Partial<RestrictionRecord>[];
  activeCODOrders?: number;
  sellerVerified?: boolean;
  areaSupported?: boolean;
  noScoreRecord?: boolean;
} = {}) {
  const tier = opts.tier ?? (opts.score !== undefined ? (opts.score <= 20 ? 'NEW_BUYER' : opts.score <= 40 ? 'TRUSTED_BEGINNER' : 'TRUSTED_BUYER') : 'NEW_BUYER');
  const scoreRepo = opts.noScoreRecord ? makeEmptyScoreRepo() : makeScoreRepo(opts.score ?? 0, tier);
  const restrictionRepo = opts.restrictions ? makeRestrictionRepo(opts.restrictions) : makeEmptyRestrictionRepo();
  const orderRepo = makeOrderRepo(opts.activeCODOrders ?? 0);
  const authService = makeAuthService(opts.sellerVerified ?? true);
  const logisticsService = makeLogisticsService(opts.areaSupported ?? true);

  return new ProgressiveCODEligibilityEngine(
    scoreRepo,
    restrictionRepo,
    orderRepo as any,
    authService,
    logisticsService
  );
}

const SELLER_ADDRESS_DAR = { city: 'Dar es Salaam', country: 'Tanzania' };
const SELLER_ADDRESS_ARUSHA = { city: 'Arusha', country: 'Tanzania' };

// ─── checkBuyerEligibility ────────────────────────────────────────────────────

describe('checkBuyerEligibility', () => {
  it('new buyer (score 0, no restrictions) → eligible', async () => {
    const engine = makeEngine({ score: 0 });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(true);
  });

  it('buyer with no score record (first-time) → eligible', async () => {
    const engine = makeEngine({ noScoreRecord: true });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(true);
  });

  it('trusted beginner (score 30) → eligible', async () => {
    const engine = makeEngine({ score: 30, tier: 'TRUSTED_BEGINNER' });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(true);
  });

  it('trusted buyer (score 80) → eligible', async () => {
    const engine = makeEngine({ score: 80, tier: 'TRUSTED_BUYER' });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(true);
  });

  it('buyer with active temporary restriction → ineligible', async () => {
    const engine = makeEngine({
      restrictions: [{ reason: 'Suspicious activity', permanent: false, endsAt: new Date(Date.now() + 86400_000) }],
    });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('temporarily restricted');
  });

  it('buyer with permanent restriction → ineligible with COD_PERMANENTLY_DISABLED', async () => {
    const engine = makeEngine({
      restrictions: [{ reason: 'Fraud confirmed', permanent: true, endsAt: new Date(Date.now() + 86400_000) }],
    });
    const result = await engine.checkBuyerEligibility('buyer-001');
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('COD_PERMANENTLY_DISABLED');
  });
});

// ─── checkSellerEligibility ───────────────────────────────────────────────────

describe('checkSellerEligibility', () => {
  it('verified seller → eligible', async () => {
    const engine = makeEngine({ sellerVerified: true });
    const result = await engine.checkSellerEligibility('seller-001');
    expect(result.eligible).toBe(true);
  });

  it('unverified seller → ineligible with SELLER_NOT_VERIFIED', async () => {
    const engine = makeEngine({ sellerVerified: false });
    const result = await engine.checkSellerEligibility('seller-001');
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('SELLER_NOT_VERIFIED');
  });
});

// ─── checkOrderEligibility — Value Cap ───────────────────────────────────────

describe('checkOrderEligibility — value cap', () => {
  it('NEW_BUYER with order TZS 25,000 → eligible (within TZS 30k limit)', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    const order = makeOrder({ totalAmount: 25_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('NEW_BUYER with order TZS 30,000 → eligible (exactly at limit)', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    const order = makeOrder({ totalAmount: 30_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('NEW_BUYER with order TZS 30,001 → ineligible (exceeds TZS 30k limit)', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    const order = makeOrder({ totalAmount: 30_001 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('30,000');
  });

  it('TRUSTED_BEGINNER with order TZS 140,000 → eligible', async () => {
    const engine = makeEngine({ score: 30, tier: 'TRUSTED_BEGINNER' });
    const order = makeOrder({ totalAmount: 140_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('TRUSTED_BEGINNER with order TZS 150,001 → ineligible (exceeds TZS 150k limit)', async () => {
    const engine = makeEngine({ score: 30, tier: 'TRUSTED_BEGINNER' });
    const order = makeOrder({ totalAmount: 150_001 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('150,000');
  });

  it('TRUSTED_BUYER with order TZS 2,000,000 → eligible (no limit)', async () => {
    const engine = makeEngine({ score: 80, tier: 'TRUSTED_BUYER' });
    const order = makeOrder({ totalAmount: 2_000_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });
});

// ─── checkOrderEligibility — Geographic Constraint ───────────────────────────

describe('checkOrderEligibility — geographic constraint (NEW_BUYER)', () => {
  it('NEW_BUYER with same-city delivery → eligible', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    const order = makeOrder({ totalAmount: 5_000, deliveryCity: 'Dar es Salaam' });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('NEW_BUYER with cross-city delivery → ineligible', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    const order = makeOrder({ totalAmount: 5_000, deliveryCity: 'Arusha' });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('same city');
  });

  it('TRUSTED_BEGINNER with cross-city delivery → eligible (no geo restriction)', async () => {
    const engine = makeEngine({ score: 30, tier: 'TRUSTED_BEGINNER' });
    const order = makeOrder({ totalAmount: 5_000, deliveryCity: 'Arusha' });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('TRUSTED_BUYER with cross-city delivery → eligible (no geo restriction)', async () => {
    const engine = makeEngine({ score: 80, tier: 'TRUSTED_BUYER' });
    const order = makeOrder({ totalAmount: 5_000, deliveryCity: 'Mwanza' });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_ARUSHA);
    expect(result.eligible).toBe(true);
  });
});

// ─── checkOrderEligibility — Concurrency Limit ───────────────────────────────

describe('checkOrderEligibility — concurrency limit (NEW_BUYER)', () => {
  it('NEW_BUYER with 0 active COD orders → eligible', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER', activeCODOrders: 0 });
    const order = makeOrder({ totalAmount: 5_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });

  it('NEW_BUYER with 1 active COD order → ineligible (concurrency limit)', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER', activeCODOrders: 1 });
    const order = makeOrder({ totalAmount: 5_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('1 active COD order');
  });

  it('TRUSTED_BEGINNER with 3 active COD orders → eligible (no concurrency limit)', async () => {
    const engine = makeEngine({ score: 30, tier: 'TRUSTED_BEGINNER', activeCODOrders: 3 });
    const order = makeOrder({ totalAmount: 5_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(true);
  });
});

// ─── checkOrderEligibility — Area Support ────────────────────────────────────

describe('checkOrderEligibility — area support', () => {
  it('unsupported delivery area → ineligible with UNSUPPORTED_AREA', async () => {
    const engine = makeEngine({ score: 80, tier: 'TRUSTED_BUYER', areaSupported: false });
    const order = makeOrder({ totalAmount: 5_000 });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('UNSUPPORTED_AREA');
  });
});

// ─── Fail-fast ordering ───────────────────────────────────────────────────────

describe('checkOrderEligibility — fail-fast ordering', () => {
  it('value check fails before geographic check', async () => {
    const engine = makeEngine({ score: 0, tier: 'NEW_BUYER' });
    // Order exceeds value limit AND is cross-city — should fail on value first
    const order = makeOrder({ totalAmount: 50_000, deliveryCity: 'Arusha' });
    const result = await engine.checkOrderEligibility(order, SELLER_ADDRESS_DAR);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('30,000'); // value check, not geo check
  });
});
