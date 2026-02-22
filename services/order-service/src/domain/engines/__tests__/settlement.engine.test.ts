import { SettlementService, SettlementRequest } from '../settlement.engine';

describe('SettlementService', () => {
    let service: SettlementService;

    beforeEach(() => {
        service = new SettlementService();
    });

    const request: SettlementRequest = {
        orderId: 'order-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalAmount: 50000,
        paymentMethod: 'WALLET',
        commissionRate: 0.1 // 10%
    };

    describe('processSettlement', () => {
        it('should calculate correct splits for digital payment', async () => {
            const result = await service.processSettlement(request);

            expect(result.settlementId).toBeDefined();
            expect(result.status).toBe('completed');

            // Commission: 10% of 50000 = 5000
            expect(result.platformCommission).toBe(5000);

            // Courier: 500 + 2% of 50000 (1000) = 1500. Max check: 10% of 50000 = 5000. 1500 < 5000.
            expect(result.courierEarnings).toBe(1500);

            // Seller: 50000 - 5000 - 1500 = 43500
            expect(result.sellerPayout).toBe(43500);
        });

        it('should handle COD pending status', async () => {
            const codResult = await service.processSettlement({ ...request, paymentMethod: 'COD' });
            expect(codResult.status).toBe('pending');
        });

        it('should cap courier earnings at 10%', async () => {
            // Amount where base+2% > 10%
            // 500 + 0.02x > 0.1x => 500 > 0.08x => x < 6250
            const smallAmountRequest = { ...request, totalAmount: 1000 };

            const result = await service.processSettlement(smallAmountRequest);
            // Base 500 + 20 = 520. Max 10% of 1000 = 100.
            // Should be capped at 100.
            expect(result.courierEarnings).toBe(100);
        });

        it('should handle floating point precision', async () => {
            const result = await service.processSettlement({ ...request, totalAmount: 10000.55 });
            expect(result.platformCommission).toBeCloseTo(1000.06, 2); // 10% rounded
        });
    });
});
