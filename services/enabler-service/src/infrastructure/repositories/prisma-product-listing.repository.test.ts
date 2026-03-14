const mockPrisma = {
  enabler_ProductListing: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  }
};

jest.mock('../database/prisma-client', () => ({
  __esModule: true,
  default: mockPrisma
}));

import { PrismaProductListingRepository } from './prisma-product-listing.repository';

describe('PrismaProductListingRepository', () => {
  const makeRecord = () => ({
    id: 'pl1',
    enablerId: 'e1',
    productId: 'p1',
    sellerId: 's1',
    status: 'ACTIVE',
    visibility: true,
    customPrice: '100',
    priceMarkup: '0.2',
    listingTerms: null,
    sellerApproved: true,
    views: 0,
    clicks: 0,
    orders: 0,
    revenue: '0',
    createdAt: new Date('2026-03-09T00:00:00.000Z'),
    updatedAt: new Date('2026-03-09T00:00:00.000Z')
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('find methods map records to entities and handle null', async () => {
    mockPrisma.enabler_ProductListing.findUnique
      .mockResolvedValueOnce(makeRecord())
      .mockResolvedValueOnce(null);
    mockPrisma.enabler_ProductListing.findMany
      .mockResolvedValueOnce([makeRecord()])
      .mockResolvedValueOnce([makeRecord()])
      .mockResolvedValueOnce([makeRecord()]);
    const repo = new PrismaProductListingRepository();

    const byId = await repo.findById('pl1');
    const byIdMissing = await repo.findById('missing');
    const byEnabler = await repo.findByEnablerId('e1');
    const byProduct = await repo.findByProductId('p1');
    const active = await repo.findActiveListings('e1');

    expect(byId?.id).toBe('pl1');
    expect(byIdMissing).toBeNull();
    expect(byEnabler).toHaveLength(1);
    expect(byProduct).toHaveLength(1);
    expect(active).toHaveLength(1);
  });

  it('save, update and delete delegate to prisma', async () => {
    const repo = new PrismaProductListingRepository();
    const listing = {
      toPlainObject: () => ({
        id: 'pl1',
        enablerId: 'e1',
        productId: 'p1',
        sellerId: 's1',
        status: 'ACTIVE',
        visibility: true,
        customPrice: 100,
        priceMarkup: 0.2,
        listingTerms: { terms: true },
        sellerApproved: true,
        views: 1,
        clicks: 2,
        orders: 3,
        revenue: 200,
        createdAt: new Date('2026-03-09T00:00:00.000Z'),
        updatedAt: new Date('2026-03-09T00:00:00.000Z')
      })
    };

    await repo.save(listing as any);
    await repo.update(listing as any);
    await repo.delete('pl1');

    expect(mockPrisma.enabler_ProductListing.create).toHaveBeenCalled();
    expect(mockPrisma.enabler_ProductListing.update).toHaveBeenCalledWith({
      where: { id: 'pl1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        updatedAt: expect.any(Date)
      })
    });
    expect(mockPrisma.enabler_ProductListing.delete).toHaveBeenCalledWith({ where: { id: 'pl1' } });
  });
});
