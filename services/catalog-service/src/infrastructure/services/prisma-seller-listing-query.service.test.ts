import { PrismaSellerListingQueryService } from './prisma-seller-listing-query.service';

describe('PrismaSellerListingQueryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps active listings to SellerListingInput values', async () => {
    const now = new Date('2026-03-09T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const prisma = {
      enabler_ProductListing: {
        findMany: jest.fn().mockResolvedValue([
          {
            sellerId: 'seller-1',
            customPrice: { toNumber: () => 1200 },
            updatedAt: new Date('2026-03-08T00:00:00.000Z'),
            enabler: {
              status: 'ACTIVE',
              createdAt: new Date('2026-02-20T00:00:00.000Z')
            }
          },
          {
            sellerId: 'seller-2',
            customPrice: null,
            updatedAt: new Date('2026-02-20T00:00:00.000Z'),
            enabler: {
              status: 'SUSPENDED',
              createdAt: new Date('2025-12-01T00:00:00.000Z')
            }
          }
        ])
      }
    };

    const service = new PrismaSellerListingQueryService(prisma as never);
    const result = await service.getListingsForProduct('product-1');

    expect(prisma.enabler_ProductListing.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        status: 'ACTIVE',
        visibility: true
      },
      include: {
        enabler: {
          select: {
            status: true,
            createdAt: true
          }
        }
      }
    });

    expect(result).toEqual([
      {
        sellerId: 'seller-1',
        price: 1200,
        rating: 4,
        stock: 10,
        matchConfidence: 1,
        isSuspended: false,
        lastUpdated: new Date('2026-03-08T00:00:00.000Z'),
        isNewSeller: true,
        recencyBoost: true
      },
      {
        sellerId: 'seller-2',
        price: 0,
        rating: 4,
        stock: 10,
        matchConfidence: 1,
        isSuspended: true,
        lastUpdated: new Date('2026-02-20T00:00:00.000Z'),
        isNewSeller: false,
        recencyBoost: false
      }
    ]);
  });
});
