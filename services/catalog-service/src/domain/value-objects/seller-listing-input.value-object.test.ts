import type { SellerListingInput } from './seller-listing-input.value-object';

describe('SellerListingInput type', () => {
  it('supports seller listing contract shape', () => {
    const input: SellerListingInput = {
      sellerId: 'seller-1',
      price: 1000,
      rating: 4.8,
      stock: 50,
      matchConfidence: 0.92,
      isSuspended: false,
      lastUpdated: new Date('2026-03-08T00:00:00.000Z'),
      isNewSeller: true,
      recencyBoost: true
    };

    expect(input.sellerId).toBe('seller-1');
    expect(input.recencyBoost).toBe(true);
  });
});
