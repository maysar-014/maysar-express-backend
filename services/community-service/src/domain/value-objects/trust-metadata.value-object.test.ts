import { TrustMetadata } from './trust-metadata.value-object';

describe('TrustMetadata', () => {
  it('creates default metadata with low trust and base COD limit', () => {
    const metadata = TrustMetadata.createDefault();

    expect(metadata.isVerified).toBe(false);
    expect(metadata.ratingScore).toBe(0);
    expect(metadata.getTrustLevel()).toBe('low');
    expect(metadata.getCODLimit()).toBe(1000);
    expect(metadata.isEligibleForCOD()).toBe(false);
  });

  it('supports verified metadata and trust-level calculations', () => {
    const metadata = TrustMetadata.createVerified({
      ratingScore: 4.6,
      completedOrders: 60,
      successfulCODCount: 58,
      disputeRate: 0.03
    });

    expect(metadata.isVerified).toBe(true);
    expect(metadata.getTrustLevel()).toBe('high');
    expect(metadata.getCODLimit()).toBe(3000);
    expect(metadata.isEligibleForCOD()).toBe(true);
  });

  it('updates trust after new orders and rating changes', () => {
    const current = TrustMetadata.create({
      isVerified: true,
      ratingScore: 4.0,
      completedOrders: 9,
      successfulCODCount: 8,
      disputeRate: 0.1
    });
    const afterOrder = current.updateWithNewOrder(true);
    const rerated = afterOrder.updateRating(4.7).verify();

    expect(afterOrder.completedOrders).toBe(10);
    expect(afterOrder.successfulCODCount).toBe(9);
    expect(afterOrder.disputeRate).toBeCloseTo(0.1, 5);
    expect(rerated.ratingScore).toBe(4.7);
    expect(rerated.isVerified).toBe(true);
  });

  it('validates invalid ranges and supports equality/JSON', () => {
    expect(() => TrustMetadata.create({ ratingScore: 5.5 })).toThrow('Rating score must be between 0 and 5');
    expect(() => TrustMetadata.create({ completedOrders: 1, successfulCODCount: 2 })).toThrow(
      'Successful COD count cannot exceed completed orders'
    );
    expect(() => TrustMetadata.create({ disputeRate: 2 })).toThrow('Dispute rate must be between 0 and 1');

    const a = TrustMetadata.create({ isVerified: true, ratingScore: 4.2, completedOrders: 20, successfulCODCount: 19, disputeRate: 0.05 });
    const b = TrustMetadata.create({ isVerified: true, ratingScore: 4.2, completedOrders: 20, successfulCODCount: 19, disputeRate: 0.05 });
    expect(a.equals(b)).toBe(true);
    expect(a.toJSON()).toEqual(expect.objectContaining({ trustLevel: 'medium', codLimit: 2000 }));
  });
});
