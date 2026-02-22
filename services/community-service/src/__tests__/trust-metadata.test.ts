import { TrustMetadata } from '../domain/value-objects/trust-metadata.value-object';

describe('TrustMetadata', () => {
    it('should create default trust metadata', () => {
        const trust = TrustMetadata.createDefault();
        expect(trust.isVerified).toBe(false);
        expect(trust.ratingScore).toBe(0);
        expect(trust.getTrustLevel()).toBe('low');
    });

    it('should update with new successful order', () => {
        const trust = TrustMetadata.create({
            ratingScore: 4.0,
            completedOrders: 10,
            successfulCODCount: 10
        });

        const updated = trust.updateWithNewOrder(true);
        expect(updated.completedOrders).toBe(11);
        expect(updated.successfulCODCount).toBe(11);
        expect(updated.ratingScore).toBeGreaterThan(4.0);
    });

    it('should calculate trust levels correctly', () => {
        // Elite
        const elite = TrustMetadata.create({
            ratingScore: 4.9,
            completedOrders: 200,
            disputeRate: 0.01,
            isVerified: true
        });
        expect(elite.getTrustLevel()).toBe('elite');

        // High
        const high = TrustMetadata.create({
            ratingScore: 4.6,
            completedOrders: 60,
            disputeRate: 0.04,
            isVerified: true
        });
        expect(high.getTrustLevel()).toBe('high');
    });

    it('should determine COD eligibility', () => {
        const ineligible = TrustMetadata.createDefault();
        expect(ineligible.isEligibleForCOD()).toBe(false);

        const eligible = TrustMetadata.create({
            isVerified: true,
            ratingScore: 4.5,
            completedOrders: 20,
            disputeRate: 0.02
        });
        expect(eligible.isEligibleForCOD()).toBe(true);
    });

    it('should return correct COD limits based on trust level', () => {
        const elite = TrustMetadata.create({
            ratingScore: 4.9,
            completedOrders: 200,
            disputeRate: 0.01,
            isVerified: true
        });
        expect(elite.getCODLimit()).toBe(5000);

        const low = TrustMetadata.createDefault();
        expect(low.getCODLimit()).toBe(1000);
    });

    it('should throw error for invalid rating score', () => {
        expect(() => TrustMetadata.create({ ratingScore: 6 })).toThrow('Rating score must be between 0 and 5');
    });

    it('should throw error if successful COD count exceeds completed orders', () => {
        expect(() => TrustMetadata.create({
            completedOrders: 5,
            successfulCODCount: 10
        })).toThrow('Successful COD count cannot exceed completed orders');
    });
});
