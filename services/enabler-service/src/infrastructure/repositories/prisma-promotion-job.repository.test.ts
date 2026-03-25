const mockPrisma = {
  campaign_Campaign: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { PrismaPromotionJobRepository } from './prisma-promotion-job.repository';

describe('PrismaPromotionJobRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps promotion campaigns into marketplace jobs', async () => {
    const record = {
      id: 'cam_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      name: 'Ramadan Promotion',
      description: 'Boost seasonal products',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      type: 'PROMOTION',
      status: 'ACTIVE',
      startDate: new Date('2026-03-20T00:00:00.000Z'),
      endDate: new Date('2026-03-30T00:00:00.000Z'),
      timezone: 'Africa/Dar_es_Salaam',
      pricingRules: [{ id: 'rule-1' }],
      products: [{ productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV' }],
      categories: [{ categoryId: 'cat_01ARZ3NDEKTSV4RRFFQ69G5FAV' }],
      metadata: { brief: 'Promote seasonal offers' },
      createdAt: new Date('2026-03-19T00:00:00.000Z'),
      updatedAt: new Date('2026-03-19T00:00:00.000Z')
    };
    mockPrisma.campaign_Campaign.findFirst.mockResolvedValue(record);
    mockPrisma.campaign_Campaign.findMany.mockResolvedValue([record]);
    mockPrisma.campaign_Campaign.count.mockResolvedValue(1);
    const repo = new PrismaPromotionJobRepository();

    const job = await repo.findById('cam_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    const page = await repo.findMarketplaceJobs({ page: 1, limit: 20 });

    expect(job?.toPlainObject().title).toBe('Ramadan Promotion');
    expect(page.items[0].toPlainObject().pricingRuleCount).toBe(1);
    expect(mockPrisma.campaign_Campaign.count).toHaveBeenCalled();
  });

  it('passes marketplace filters through to Prisma', async () => {
    mockPrisma.campaign_Campaign.findMany.mockResolvedValue([]);
    mockPrisma.campaign_Campaign.count.mockResolvedValue(0);
    const repo = new PrismaPromotionJobRepository();

    await repo.findMarketplaceJobs({
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      status: 'SCHEDULED',
      excludeIds: ['cam_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      page: 2,
      limit: 10
    });

    expect(mockPrisma.campaign_Campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          status: { in: ['SCHEDULED'] },
          id: { notIn: ['cam_01ARZ3NDEKTSV4RRFFQ69G5FAV'] }
        }),
        skip: 10,
        take: 10
      })
    );
  });
});
