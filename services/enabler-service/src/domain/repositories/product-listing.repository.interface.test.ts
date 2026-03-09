import type { ProductListingEntity } from '../entities/product-listing.entity';
import type { IProductListingRepository } from './product-listing.repository.interface';

describe('IProductListingRepository contract', () => {
  it('supports listing query and persistence operations', async () => {
    const listing = { id: 'pl-1' } as unknown as ProductListingEntity;
    const repo: IProductListingRepository = {
      findById: jest.fn().mockResolvedValue(listing),
      findByEnablerId: jest.fn().mockResolvedValue([listing]),
      findByProductId: jest.fn().mockResolvedValue([listing]),
      findActiveListings: jest.fn().mockResolvedValue([listing]),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined)
    };

    expect(await repo.findById('pl-1')).toBe(listing);
    expect((await repo.findByEnablerId('enabler-1')).length).toBe(1);
    expect((await repo.findByProductId('product-1')).length).toBe(1);
    expect((await repo.findActiveListings('enabler-1')).length).toBe(1);
  });
});
