import { SellerHappinessEngine } from '../SellerHappinessEngine';

describe('SellerHappinessEngine', () => {
    let engine: SellerHappinessEngine;

    beforeEach(() => {
        engine = new SellerHappinessEngine();
    });

    it('calculates product expansion rate', () => {
        expect(engine.calculateProductExpansion([])).toBe(0);

        const result = engine.calculateProductExpansion([
            {
                sellerId: 's1',
                userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
                firstProductAddedAt: new Date('2026-02-05T00:00:00.000Z'),
                totalProductsAdded: 2
            },
            {
                sellerId: 's2',
                userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
                firstProductAddedAt: null,
                totalProductsAdded: 0
            }
        ]);

        expect(result).toBe(50);
    });

    it('counts completed referrals only', () => {
        const result = engine.calculateReferralCount([
            { referrerId: 'r1', referralId: 'x1', status: 'completed' },
            { referrerId: 'r2', referralId: 'x2', status: 'pending' }
        ]);
        expect(result).toBe(1);
    });

    it('returns aggregate happiness metrics', () => {
        const metrics = engine.calculateMetrics(
            [
                {
                    sellerId: 's1',
                    userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    firstProductAddedAt: new Date('2026-02-05T00:00:00.000Z'),
                    totalProductsAdded: 2
                }
            ],
            [{ referrerId: 'r1', referralId: 'x1', status: 'completed' }]
        );

        expect(metrics).toEqual({
            productExpansionRate: 100,
            referralCount: 1
        });
    });
});
