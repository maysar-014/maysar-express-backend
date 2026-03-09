import type { ISellerListingQueryService } from './seller-listing-query.service';

describe('ISellerListingQueryService contract', () => {
  it('returns seller listing inputs for a product query', async () => {
    const service: ISellerListingQueryService = {
      getListingsForProduct: jest.fn().mockResolvedValue([
        {
          sellerId: 'seller-1',
          price: 100000,
          rating: 4.8,
          stock: 20,
          matchConfidence: 0.95,
          isSuspended: false,
          lastUpdated: new Date('2026-03-09T00:00:00.000Z')
        }
      ])
    };

    const listings = await service.getListingsForProduct('product-1');
    expect(listings).toHaveLength(1);
    expect(listings[0].sellerId).toBe('seller-1');
  });
});
