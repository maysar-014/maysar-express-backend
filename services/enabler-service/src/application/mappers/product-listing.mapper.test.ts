import { ProductListingMapper } from './product-listing.mapper';
import { ProductListingEntity } from '../../domain/entities/product-listing.entity';
import { Enabler_ListingStatus } from '../../domain/types/enabler.types';

const createListing = (): ProductListingEntity =>
  ProductListingEntity.create({
    id: 'listing-1',
    enablerId: 'enabler-1',
    productId: 'product-1',
    sellerId: 'seller-1',
    status: Enabler_ListingStatus.ACTIVE,
    visibility: true,
    customPrice: 120000,
    priceMarkup: 0.15,
    sellerApproved: true,
    views: 10,
    clicks: 6,
    orders: 2,
    revenue: 240000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z')
  });

describe('ProductListingMapper', () => {
  it('maps listing entity to response dto', () => {
    const dto = ProductListingMapper.toResponseDto(createListing());

    expect(dto).toEqual({
      id: 'listing-1',
      enablerId: 'enabler-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      status: Enabler_ListingStatus.ACTIVE,
      customPrice: 120000,
      priceMarkup: 0.15,
      visibility: true,
      sellerApproved: true,
      views: 10,
      clicks: 6,
      orders: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });
  });

  it('maps listing arrays to dto arrays', () => {
    const list = ProductListingMapper.toResponseList([createListing()]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('listing-1');
  });
});
