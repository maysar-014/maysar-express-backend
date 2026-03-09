const mockPrisma = {
  analytics_SellerInventoryHealth: {
    findMany: jest.fn()
  },
  support_Ticket: {
    count: jest.fn()
  },
  analytics_SellerProductPerformance: {
    findMany: jest.fn()
  },
  analytics_SellerActionItem: {
    upsert: jest.fn()
  }
};

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { GenerateActionCenter } from './GenerateActionCenter';

describe('GenerateActionCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates action items for restock, inquiries, and low conversion', async () => {
    mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([
      { productId: 'prod-1', daysUntilStockout: 2 }
    ]);
    mockPrisma.support_Ticket.count.mockResolvedValue(6);
    mockPrisma.analytics_SellerProductPerformance.findMany.mockResolvedValue([{ productId: 'prod-2' }, { productId: 'prod-3' }]);
    mockPrisma.analytics_SellerActionItem.upsert.mockResolvedValue(undefined);

    const useCase = new GenerateActionCenter();
    const actions = await useCase.execute('seller-1');

    expect(mockPrisma.analytics_SellerActionItem.upsert).toHaveBeenCalledTimes(3);
    expect(actions).toEqual([
      { type: 'RESTOCK', priority: 'HIGH', productId: 'prod-1' },
      { type: 'RESPOND_INQUIRY', priority: 'HIGH', count: 6 },
      { type: 'PRICE_ADJUSTMENT', priority: 'MEDIUM', count: 2 }
    ]);
  });

  it('returns empty actions when no conditions are met', async () => {
    mockPrisma.analytics_SellerInventoryHealth.findMany.mockResolvedValue([]);
    mockPrisma.support_Ticket.count.mockResolvedValue(0);
    mockPrisma.analytics_SellerProductPerformance.findMany.mockResolvedValue([]);

    const useCase = new GenerateActionCenter();
    const actions = await useCase.execute('seller-2');

    expect(mockPrisma.analytics_SellerActionItem.upsert).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
  });
});

