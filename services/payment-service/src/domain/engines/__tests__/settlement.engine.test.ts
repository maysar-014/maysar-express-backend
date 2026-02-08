import { SettlementEngine, SettlementRequest } from '../settlement.engine';

describe('Settlement Engine', () => {
    let engine: SettlementEngine;

    beforeEach(() => {
        engine = new SettlementEngine();
    });

    describe('Settlement Calculation', () => {
        const request: SettlementRequest = {
            paymentAmount: 1000,
            paymentMethod: 'MPESA',
            sellerId: 'seller_123'
        };

        it('should calculate basic settlement', () => {
            const result = engine.calculateSettlement(request);

            // Platform fee 2% = 20
            // Provider fee 1.5% = 15
            // Total deduction = 35
            // Net = 965

            expect(result.totalAmount).toBe(1000);
            expect(result.platformFee).toBe(20);
            expect(result.providerFee).toBe(15);
            expect(result.sellerAmount).toBe(965);
            expect(result.netSettlement).toBe(965);
            expect(result.commissions).toHaveLength(0);
        });

        it('should calculate settlement with affiliate', () => {
            const result = engine.calculateSettlement({ ...request, affiliateId: 'aff_123' });

            // Affiliate 1% = 10
            // Total deduction = 35 + 10 = 45
            // Net = 955

            expect(result.sellerAmount).toBe(955);
            expect(result.commissions).toHaveLength(1);
            expect(result.commissions[0].recipient).toBe('aff_123');
            expect(result.commissions[0].amount).toBe(10);
        });

        it('should calculate settlement with referrer', () => {
            const result = engine.calculateSettlement({ ...request, referrerId: 'ref_123' });

            // Referrer 0.5% = 5
            // Total deduction = 35 + 5 = 40
            // Net = 960

            expect(result.sellerAmount).toBe(960);
            expect(result.commissions).toHaveLength(1);
            expect(result.commissions[0].recipient).toBe('ref_123');
            expect(result.commissions[0].amount).toBe(5);
        });
    });

    describe('Split Payment', () => {
        it('should split payment equally', () => {
            const splits = [
                { recipientId: 'r1', percentage: 0.5 },
                { recipientId: 'r2', percentage: 0.5 }
            ];
            const result = engine.splitPayment(1000, splits);

            expect(result).toHaveLength(2);
            expect(result[0].amount).toBe(500);
            expect(result[1].amount).toBe(500);
        });

        it('should handle uneven split', () => {
            const splits = [
                { recipientId: 'r1', percentage: 0.33 },
                { recipientId: 'r2', percentage: 0.33 },
                { recipientId: 'r3', percentage: 0.34 }
            ];
            const result = engine.splitPayment(100, splits);

            // 33, 33, 34
            expect(result[0].amount).toBe(33);
            expect(result[1].amount).toBe(33);
            expect(result[2].amount).toBe(34);
        });

        it('should throw if percentages do not sum to 100%', () => {
            const splits = [{ recipientId: 'r1', percentage: 0.5 }];
            expect(() => engine.splitPayment(1000, splits)).toThrow('Split percentages must total 100%');
        });
    });

    describe('Seller Payout', () => {
        it('should calculate seller payout helper', () => {
            const payout = engine.calculateSellerPayout(1000, 'MPESA', true, false);
            // 1000 - 20 - 15 - 10 = 955
            expect(payout).toBe(955);
        });
    });
});
