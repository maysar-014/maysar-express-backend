const mockPrisma = {
  order_Order: {
    findMany: jest.fn()
  },
  payment_Refund: {
    findMany: jest.fn()
  },
  logistics_Delivery: {
    findMany: jest.fn()
  },
  support_Ticket: {
    findMany: jest.fn()
  },
  product: {
    findMany: jest.fn()
  },
  analytics_SellerInventoryHealth: {
    findMany: jest.fn()
  },
  business: {
    findFirst: jest.fn()
  },
  mediaRef: {
    findMany: jest.fn()
  },
  analytics_SellerMetrics: {
    upsert: jest.fn()
  },
  analytics_SellerActionItem: {
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  },
  analytics_Event: {
    create: jest.fn()
  }
};

jest.resetModules();
jest.doMock('../../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GetSellerSlaReport } = require('../GetSellerSlaReport') as typeof import('../GetSellerSlaReport');

describe('GetSellerSlaReport', () => {
  const sellerId = 'seller-1';
  const now = new Date('2026-03-31T12:00:00.000Z');
  const orderCreatedAt = new Date('2026-03-31T07:00:00.000Z');
  const deliveryCreatedAt = new Date('2026-03-31T10:00:00.000Z');
  const ticketCreatedAt = new Date('2026-03-31T10:00:00.000Z');
  const ticketReplyAt = new Date('2026-03-31T10:10:00.000Z');

  const seedHealthyData = (): void => {
    mockPrisma.order_Order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        status: 'CONFIRMED',
        createdAt: orderCreatedAt,
        updatedAt: orderCreatedAt,
        cancelledAt: null
      }
    ]);
    mockPrisma.payment_Refund.findMany.mockResolvedValue([]);
    mockPrisma.logistics_Delivery.findMany.mockResolvedValue([
      {
        orderId: 'order-1',
        status: 'DELIVERED',
        createdAt: deliveryCreatedAt,
        updatedAt: deliveryCreatedAt,
        estimatedDeliveryTime: new Date('2026-03-31T12:00:00.000Z'),
        actualDeliveryTime: deliveryCreatedAt
      }
    ]);
    mockPrisma.support_Ticket.findMany.mockResolvedValue([
      {
        id: 'ticket-1',
        priority: 'HIGH',
        status: 'OPEN',
        assignedAgentId: 'agent-1',
        createdAt: ticketCreatedAt,
        resolvedAt: null,
        closedAt: null,
        messages: [
          {
            senderType: 'CUSTOMER',
            createdAt: ticketCreatedAt,
            isInternal: false
          },
          {
            senderType: 'AGENT',
            createdAt: ticketReplyAt,
            isInternal: false
          }
        ]
      }
    ]);
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        description: 'A premium product',
        status: 'published',
        seoTitle: 'Premium product',
        shortSeoDescription: 'Premium product listing',
        tags: ['featured'],
        qualityScore: 90,
        variants: [{ id: 'variant-1' }],
        structuredAttributes: [{ id: 'attr-1' }]
      }
    ]);
    mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([
      { currentStock: 20, stockStatus: 'IN_STOCK' },
      { currentStock: 3, stockStatus: 'LOW_STOCK' },
      { currentStock: 0, stockStatus: 'IN_STOCK' },
      { currentStock: 6, stockStatus: 'IN_STOCK' },
      { currentStock: 9, stockStatus: 'IN_STOCK' },
      { currentStock: 11, stockStatus: 'IN_STOCK' },
      { currentStock: 2, stockStatus: 'IN_STOCK' },
      { currentStock: 7, stockStatus: 'IN_STOCK' },
      { currentStock: 8, stockStatus: 'IN_STOCK' },
      { currentStock: 12, stockStatus: 'IN_STOCK' },
      { currentStock: 13, stockStatus: 'IN_STOCK' },
      { currentStock: 14, stockStatus: 'IN_STOCK' },
      { currentStock: 15, stockStatus: 'IN_STOCK' },
      { currentStock: 16, stockStatus: 'IN_STOCK' },
      { currentStock: 17, stockStatus: 'IN_STOCK' },
      { currentStock: 18, stockStatus: 'IN_STOCK' },
      { currentStock: 19, stockStatus: 'IN_STOCK' },
      { currentStock: 21, stockStatus: 'IN_STOCK' },
      { currentStock: 22, stockStatus: 'IN_STOCK' },
      { currentStock: 23, stockStatus: 'IN_STOCK' }
    ]);
    mockPrisma.business.findFirst.mockResolvedValue({
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      complianceStatus: 'COMPLIANT',
      documents: [{ status: 'APPROVED' }]
    });
    mockPrisma.mediaRef.findMany.mockResolvedValue([
      {
        entityId: 'product-1',
        displayOrder: 0,
        isPrimary: true,
        url: 'https://cdn.example.com/product-1.jpg'
      }
    ]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({ sellerId });
    mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue([]);
    mockPrisma.analytics_SellerActionItem.update.mockResolvedValue({});
    mockPrisma.analytics_SellerActionItem.upsert.mockResolvedValue({});
    mockPrisma.analytics_Event.create.mockResolvedValue({ id: 'event-1' });
  };

  const seedEvaluateData = (): void => {
    mockPrisma.order_Order.findMany.mockResolvedValue([
      {
        id: 'order-2',
        status: 'PENDING',
        createdAt: new Date('2026-03-31T04:00:00.000Z'),
        updatedAt: new Date('2026-03-31T04:00:00.000Z'),
        cancelledAt: null
      }
    ]);
    mockPrisma.payment_Refund.findMany.mockResolvedValue([]);
    mockPrisma.logistics_Delivery.findMany.mockResolvedValue([
      {
        orderId: 'order-2',
        status: 'IN_TRANSIT',
        createdAt: new Date('2026-04-01T04:30:00.000Z'),
        updatedAt: new Date('2026-04-01T04:30:00.000Z'),
        estimatedDeliveryTime: new Date('2026-04-01T05:00:00.000Z'),
        actualDeliveryTime: null
      }
    ]);
    mockPrisma.support_Ticket.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([]);
    mockPrisma.business.findFirst.mockResolvedValue(null);
    mockPrisma.mediaRef.findMany.mockResolvedValue([]);
    mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({ sellerId });
    mockPrisma.analytics_SellerActionItem.findMany.mockResolvedValue([]);
    mockPrisma.analytics_SellerActionItem.update.mockResolvedValue({});
    mockPrisma.analytics_SellerActionItem.upsert.mockResolvedValue({});
    mockPrisma.analytics_Event.create.mockResolvedValue({ id: 'event-2' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a report without persistence in report mode', async () => {
    seedHealthyData();

    const useCase = new GetSellerSlaReport();
    const result = await useCase.execute(sellerId, { now, lookbackDays: 30 });

    expect(result.report.sellerId).toBe(sellerId);
    expect(result.report.status).toBe('manual');
    expect(result.report.goLiveReadinessScore).toBe(100);
    expect(result.report.breaches).toHaveLength(0);
    expect(result.persistence).toBeUndefined();
    expect(mockPrisma.analytics_SellerMetrics.upsert).not.toHaveBeenCalled();
  });

  it('persists breaches and audit events in evaluate mode', async () => {
    seedEvaluateData();

    const useCase = new GetSellerSlaReport();
    const result = await useCase.execute(sellerId, { now, lookbackDays: 30, mode: 'evaluate' });

    expect(result.report.sellerId).toBe(sellerId);
    expect(result.report.breaches.length).toBeGreaterThan(0);
    expect(result.persistence).toEqual(
      expect.objectContaining({
        actionItemsUpserted: expect.any(Number),
        actionItemsResolved: expect.any(Number),
        eventId: 'event-2'
      })
    );
    expect(mockPrisma.analytics_SellerMetrics.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.analytics_SellerActionItem.upsert).toHaveBeenCalled();
    expect(mockPrisma.analytics_Event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'seller_sla.evaluated'
        })
      })
    );
  });
});
