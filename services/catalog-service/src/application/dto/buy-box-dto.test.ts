import type {
  BuyBoxAlternativeDto,
  BuyBoxResponseDto,
  ComputeBuyBoxRequestDto
} from './buy-box-dto';
import type { SellerListingInput } from '../../domain/value-objects/seller-listing-input.value-object';

describe('buy-box dto contracts', () => {
  it('supports compute request and response shapes', () => {
    const listing: SellerListingInput = {
      sellerId: 'seller-3',
      price: 900,
      rating: 4.7,
      stock: 20,
      matchConfidence: 0.95,
      isSuspended: false,
      lastUpdated: new Date('2026-03-08T00:00:00.000Z')
    };
    const request: ComputeBuyBoxRequestDto = {
      productId: 'product-3',
      listings: [listing]
    };
    const alternative: BuyBoxAlternativeDto = {
      sellerId: 'seller-4',
      score: 88,
      rank: 2
    };
    const response: BuyBoxResponseDto = {
      productId: 'product-3',
      primarySellerId: 'seller-3',
      primaryScore: 95,
      alternatives: [alternative],
      lastComputedAt: new Date('2026-03-08T01:00:00.000Z')
    };

    expect(request.listings[0].sellerId).toBe('seller-3');
    expect(response.alternatives[0].rank).toBe(2);
  });
});
