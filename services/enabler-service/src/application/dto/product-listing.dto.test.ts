import type {
  CreateProductListingDto,
  ProductListingResponseDto,
  UpdateProductListingDto
} from './product-listing.dto';

describe('product-listing DTO contracts', () => {
  it('supports create and update listing payloads', () => {
    const createDto: CreateProductListingDto = {
      productId: 'product-1',
      customPrice: 90000,
      priceMarkup: 0.1,
      visibility: true,
      minOrderQuantity: 2
    };
    const updateDto: UpdateProductListingDto = {
      customPrice: 95000,
      visibility: false
    };

    expect(createDto.productId).toBe('product-1');
    expect(updateDto.visibility).toBe(false);
  });

  it('supports product listing response payloads', () => {
    const response: ProductListingResponseDto = {
      id: 'listing-1',
      enablerId: 'enabler-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      status: 'ACTIVE',
      customPrice: 90000,
      priceMarkup: 0.1,
      visibility: true,
      sellerApproved: true,
      views: 100,
      clicks: 50,
      orders: 12,
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    };

    expect(response.orders).toBe(12);
    expect(response.visibility).toBe(true);
  });
});
