import { SellerSlaEngine, type SellerSlaFacts } from '../SellerSlaEngine';

const baseFacts = (overrides: Partial<SellerSlaFacts> = {}): SellerSlaFacts => ({
  sellerId: 'seller-1',
  periodStart: new Date('2026-03-01T00:00:00.000Z'),
  periodEnd: new Date('2026-03-31T12:00:00.000Z'),
  now: new Date('2026-03-31T12:00:00.000Z'),
  totalOrders: 1,
  confirmedOnTimeOrders: 1,
  pendingOverdueOrders: 0,
  cancelledOrders: 0,
  dispatchTotal: 1,
  dispatchOnTime: 1,
  dispatchLate: 0,
  inventoryTotal: 20,
  inventoryInStock: 19,
  inventoryLowStock: 1,
  inventoryOutOfStock: 0,
  catalogTotal: 1,
  catalogPublished: 1,
  catalogAverageCompleteness: 100,
  catalogAverageQualityScore: 90,
  catalogProductsWithMedia: 1,
  catalogProductsWithDescription: 1,
  catalogProductsWithVariants: 1,
  customerTicketsTotal: 1,
  customerTicketsRespondedWithin30: 1,
  urgentTicketsTotal: 1,
  urgentTicketsRespondedWithin15: 1,
  averageFirstResponseMinutes: 10,
  supportOpenHighOver4h: 0,
  supportOpenMediumOver24h: 0,
  supportOpenUnassignedOver1h: 0,
  deliveriesTotal: 1,
  deliveriesOnTime: 1,
  deliveriesLate: 0,
  averageDeliveryDelayHours: 0,
  refundsTotal: 0,
  refundsCompletedWithin48h: 0,
  averageRefundProcessingHours: null,
  refundRate: 0,
  businessPresent: true,
  businessActive: true,
  businessVerified: true,
  businessCompliant: true,
  businessDocumentsApproved: 1,
  businessDocumentsTotal: 1,
  ...overrides
});

describe('SellerSlaEngine', () => {
  it('keeps the report in manual status when only manual readiness gates remain', () => {
    const engine = new SellerSlaEngine();
    const report = engine.assess(baseFacts());

    expect(report.status).toBe('manual');
    expect(report.goLiveReadinessScore).toBe(100);
    expect(report.breaches).toHaveLength(0);
    expect(report.summary.manualReadinessGates).toBeGreaterThan(0);
    expect(report.readiness.some(gate => gate.status === 'manual')).toBe(true);
  });

  it('raises a critical status when a core SLA metric is breached', () => {
    const engine = new SellerSlaEngine();
    const report = engine.assess(baseFacts({
      totalOrders: 10,
      confirmedOnTimeOrders: 2,
      pendingOverdueOrders: 8
    }));

    expect(report.status).toBe('critical');
    expect(report.breaches.some(breach => breach.key === 'order_confirmation')).toBe(true);
  });
});
