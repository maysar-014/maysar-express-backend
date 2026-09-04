/**
 * Integration test — multi-seller checkout triggers consolidation
 *
 * Backlog reference: Phase 1 §1.4 "Integration test: multi-seller checkout
 * triggers consolidation".
 *
 * Verifies the end-to-end path from a multi-seller checkout session through
 * GetDeliveryOptionsUseCase to the real ConsolidationOrchestrator:
 *
 *   1. ConsolidationOrchestrator.plan() is invoked for a multi-seller session
 *   2. At least one DeliveryGroup is returned AND persisted
 *      (logistics_DeliveryGroup) with a quote issued
 *   3. The 'delivery.consolidated' event is emitted for any group with
 *      ≥ 2 sellers — and NOT emitted for singleton groups
 *   4. The session is updated with the group → quote mapping
 *   5. An orchestrator failure degrades gracefully (empty options, no throw)
 *
 * The real ConsolidationOrchestrator + pure consolidation engine run;
 * only the infrastructure edges are faked:
 *   - (globalThis).prisma → in-memory fake covering the models the flow touches
 *   - RoutingProvider     → Haversine × 1.35 (same fallback the production
 *                           wiring in logistics-service/index.ts uses)
 *   - requestDeliveryQuote → stub returning a fixed fee (quote pricing is
 *                            covered by quote.routes.test.ts)
 *   - eventBus            → spy (production wiring currently passes no bus —
 *                           see wiring-gap note in the backlog update)
 */

import { GetDeliveryOptionsUseCase } from '../../application/use-cases/get-delivery-options.use-case';
import { ConsolidationOrchestrator } from '../../../../logistics-service/src/application/services/consolidation-orchestrator.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BUYER = { lat: -6.7924, lng: 39.2083, address: 'Dar es Salaam city centre' };

const SELLER_LOCATIONS: Record<string, any> = {
  'seller-1': { // Mikocheni — ~1.5 km from seller-2
    sellerId: 'seller-1', latitude: '-6.7700', longitude: '39.2700',
    street: 'Mikocheni Road', ward: 'Mikocheni', district: 'Kinondoni', region: 'Dar es Salaam', country: 'Tanzania',
  },
  'seller-2': { // Masaki
    sellerId: 'seller-2', latitude: '-6.7800', longitude: '39.2800',
    street: 'Haile Selassie Road', ward: 'Masaki', district: 'Kinondoni', region: 'Dar es Salaam', country: 'Tanzania',
  },
  'seller-far': { // Arusha — ~500 km away, never consolidates with Dar sellers
    sellerId: 'seller-far', latitude: '-3.3869', longitude: '36.6830',
    street: 'Sokoine Road', ward: 'Themi', district: 'Arusha City', region: 'Arusha', country: 'Tanzania',
  },
};

function makeFakePrisma(itemSellerMap: Record<string, string>) {
  const session: any = {
    id: 'sess-multi-1',
    paymentMethodId: 'COD',
    metadata: null,
    items: Object.keys(itemSellerMap).map((productId, i) => ({
      productId, quantity: 1, weight: 1 + i * 0.5,
    })),
    deliveryGroups: {},
  };
  const deliveryGroups = new Map<string, any>();
  const deliveryJobs = new Map<string, any>();
  const consolidationAudits: any[] = [];
  const sessionUpdates: any[] = [];

  const prisma: any = {
    checkout_CheckoutSession: {
      findUnique: async () => ({ ...session, deliveryGroups: { ...session.deliveryGroups } }),
      update: async ({ data }: any) => {
        Object.assign(session, data);
        sessionUpdates.push(data);
        return { ...session };
      },
    },
    product: {
      findUnique: async ({ where: { id } }: any) => ({ id, sellerId: itemSellerMap[id] }),
    },
    catalog_SellerLocation: {
      findFirst: async ({ where: { sellerId } }: any) => SELLER_LOCATIONS[sellerId] ?? null,
    },
    logistics_PricingConfig: {
      findFirst: async () => ({
        version: 2,
        consolidationRadiusKm: 5.0,
        maxConsolidatedRouteOverheadPct: 1.4,
        maxGroupWeightKg: 20.0,
      }),
    },
    logistics_DeliveryGroup: {
      upsert: async ({ where: { id }, create }: any) => {
        deliveryGroups.set(id, { ...create });
        return { ...create };
      },
      findMany: async () => Array.from(deliveryGroups.values()),
    },
    logistics_DeliveryJob: {
      upsert: async ({ where: { id }, create, update }: any) => {
        const existing = deliveryJobs.get(id);
        if (existing) {
          const merged = { ...existing, ...update, id };
          deliveryJobs.set(id, merged);
          return merged;
        }
        deliveryJobs.set(id, { ...create });
        return { ...create };
      },
      findMany: async () => Array.from(deliveryJobs.values()),
      findUnique: async ({ where: { id } }: any) => deliveryJobs.get(id) ?? null,
      update: async ({ where: { id }, data }: any) => {
        const existing = deliveryJobs.get(id);
        if (!existing) throw new Error('DeliveryJob not found');
        const merged = { ...existing, ...data, id };
        deliveryJobs.set(id, merged);
        return merged;
      },
    },
    logistics_ConsolidationAudit: {
      create: async ({ data }: any) => { consolidationAudits.push(data); return data; },
    },
  };

  return { prisma, session, deliveryGroups, deliveryJobs, consolidationAudits, sessionUpdates };
}

// ─── Harness ─────────────────────────────────────────────────────────────────

interface Harness {
  orchestrator: ConsolidationOrchestrator;
  planSpy: jest.SpyInstance;
  requestDeliveryQuote: jest.Mock;
  eventBus: { publish: jest.Mock };
}

function wireOrchestrator(): Harness {
  const haversineRoutingProvider = {
    async getRoute(from: any, to: any) {
      const dist = from.distanceTo(to);
      return { distanceKm: dist * 1.35, durationMinutes: Math.ceil((dist * 1.35 / 30) * 60) };
    },
  };

  let quoteSeq = 0;
  const requestDeliveryQuote = jest.fn(async () => ({
    quoteId: `qt-consolidated-${++quoteSeq}`,
    deliveryFee: 4500,
    pricingVersion: 2,
  }));

  const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };

  const orchestrator = new ConsolidationOrchestrator(
    haversineRoutingProvider as any,
    requestDeliveryQuote as any,
    eventBus,
  );
  const planSpy = jest.spyOn(orchestrator, 'plan');

  (globalThis as any).__consolidationOrchestrator = orchestrator;
  return { orchestrator, planSpy, requestDeliveryQuote, eventBus };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Multi-seller checkout → consolidation integration', () => {
  const useCase = new GetDeliveryOptionsUseCase();

  afterEach(() => {
    delete (globalThis as any).__consolidationOrchestrator;
    delete (globalThis as any).prisma;
    jest.restoreAllMocks();
  });

  it('invokes ConsolidationOrchestrator.plan and returns a consolidated group for two nearby sellers', async () => {
    const { prisma, deliveryGroups } = makeFakePrisma({
      'prod-1': 'seller-1',
      'prod-2': 'seller-2',
    });
    (globalThis as any).prisma = prisma;
    const { planSpy, eventBus } = wireOrchestrator();

    const result = await useCase.execute('sess-multi-1', BUYER.lat, BUYER.lng, BUYER.address);

    // 1. plan() invoked with the session id as masterOrderId
    expect(planSpy).toHaveBeenCalledTimes(1);
    expect(planSpy.mock.calls[0][0]).toBe('sess-multi-1');

    // 2. At least one group, with one consolidated group of both sellers
    expect(result.groups.length).toBeGreaterThanOrEqual(1);
    const consolidated = result.groups.find(g => g.sellerCount === 2);
    expect(consolidated).toBeDefined();
    expect(consolidated!.isConsolidated).toBe(true);
    expect(consolidated!.quoteId).toBe('qt-consolidated-1');
    expect(result.totalDeliveryFee).toBe(4500);

    // 3. DeliveryGroup persisted with both seller orders and the quote issued
    expect(deliveryGroups.size).toBe(1);
    const [group] = Array.from(deliveryGroups.values());
    expect(group.sellerOrderIds).toHaveLength(2);
    expect(group.quoteId).toBe('qt-consolidated-1');
    expect(group.status).toBe('QUOTE_ISSUED');
    expect(group.masterOrderId).toBe('sess-multi-1');

    // 4. Event emitted for the ≥2-seller group
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      'delivery.consolidated',
      expect.objectContaining({
        masterOrderId: 'sess-multi-1',
        sellerCount: 2,
        totalDeliveryCost: 4500,
        pricingVersion: 2,
      }),
    );
    // Note: the event carries the quote-group ID minted by the orchestrator,
    // which is distinct from the persisted DeliveryGroup entity's own ID.
    const eventPayload = eventBus.publish.mock.calls[0][1];
    expect(typeof eventPayload.deliveryGroupId).toBe('string');
    expect(eventPayload.deliveryGroupId).toMatch(/^DCG_/);
  });

  it('stores the group → quoteId mapping on the checkout session', async () => {
    const { prisma, session, sessionUpdates } = makeFakePrisma({
      'prod-1': 'seller-1',
      'prod-2': 'seller-2',
    });
    (globalThis as any).prisma = prisma;
    wireOrchestrator();

    const result = await useCase.execute('sess-multi-1', BUYER.lat, BUYER.lng, BUYER.address);

    expect(sessionUpdates).toHaveLength(1);
    const groupIds = Object.keys(session.deliveryGroups);
    expect(groupIds).toHaveLength(result.groups.length);
    for (const g of result.groups) {
      expect(session.deliveryGroups[g.groupId]).toMatchObject({
        quoteId: g.quoteId,
        totalCost: g.fee,
      });
      expect(session.deliveryGroups[g.groupId].sellerOrderIds.length).toBe(g.sellerCount);
    }
  });

  it('emits delivery.consolidated once per consolidated group only — not for singleton groups', async () => {
    const { prisma, deliveryGroups } = makeFakePrisma({
      'prod-1': 'seller-1',   // Dar es Salaam
      'prod-2': 'seller-far', // Arusha — far outside consolidationRadiusKm
    });
    (globalThis as any).prisma = prisma;
    const { eventBus } = wireOrchestrator();

    const result = await useCase.execute('sess-multi-1', BUYER.lat, BUYER.lng, BUYER.address);

    expect(result.groups).toHaveLength(2);
    expect(result.groups.every(g => g.sellerCount === 1 && !g.isConsolidated)).toBe(true);
    expect(deliveryGroups.size).toBe(2);
    expect(eventBus.publish).not.toHaveBeenCalled();
    // Savings only come from consolidation — singletons save nothing
    expect(result.consolidationSavingsTzs).toBe(0);
  });

  it('degrades gracefully when the orchestrator fails (empty options, no throw)', async () => {
    const { prisma } = makeFakePrisma({
      'prod-1': 'seller-1',
      'prod-2': 'seller-2',
    });
    (globalThis as any).prisma = prisma;
    const { planSpy } = wireOrchestrator();
    planSpy.mockRejectedValueOnce(new Error('routing provider down'));

    await expect(
      useCase.execute('sess-multi-1', BUYER.lat, BUYER.lng, BUYER.address),
    ).resolves.toEqual({
      groups: [],
      totalDeliveryFee: 0,
      consolidationSavingsTzs: 0,
    });
  });
});
