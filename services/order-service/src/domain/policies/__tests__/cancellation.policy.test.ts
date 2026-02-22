import { CancellationPolicy } from '../cancellation.policy';

describe('CancellationPolicy', () => {
    let policy: CancellationPolicy;

    beforeEach(() => {
        policy = new CancellationPolicy();
    });

    const mockOrder = (status: string = 'pending', createdAt: number = Date.now(), paymentMethod: string = 'COD', totalAmount: number = 10000) => ({
        id: 'order-123',
        status,
        createdAt: new Date(createdAt),
        paymentMethod,
        totalAmount
    });

    describe('canCancelOrder', () => {
        it('should return error if order not found', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(null);
            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Order not found');
        });

        it('should allow system to always cancel', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder());
            const result = await policy.canCancelOrder('order-123', 'system');
            expect(result.allowed).toBe(true);
        });

        it('should not allow cancellation if status is not pending or confirmed', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('shipped'));
            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('current status');
        });

        it('should not allow cancellation if window expired for confirmed order', async () => {
            const oldTime = Date.now() - (31 * 60 * 1000); // 31 mins ago
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('confirmed', oldTime));

            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Cancellation window expired');
        });

        it('should allow cancellation for pending order even if old', async () => {
            const oldTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('pending', oldTime));

            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(true);
        });

        it('should allow buyer to cancel COD order without penalty', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('pending', Date.now(), 'COD'));
            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(true);
            expect(result.penalty).toBeUndefined();
        });

        it('should apply penalty for buyer cancelling paid order', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('pending', Date.now(), 'CARD', 10000));
            const result = await policy.canCancelOrder('order-123', 'buyer');
            expect(result.allowed).toBe(true);
            expect(result.penalty).toBe(200); // 2% of 10000
        });

        it('should apply penalty for seller cancellation', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('pending', Date.now(), 'COD', 10000));

            const result = await policy.canCancelOrder('order-123', 'seller');
            expect(result.allowed).toBe(true);
            expect(result.penalty).toBe(500); // 5% of 10000
        });

        it('should cap seller penalty at 10000', async () => {
            jest.spyOn(policy as any, 'getOrder').mockResolvedValue(mockOrder('pending', Date.now(), 'COD', 1000000));
            // 5% of 1,000,000 is 50,000. Cap is 10,000.

            const result = await policy.canCancelOrder('order-123', 'seller');
            expect(result.allowed).toBe(true);
            expect(result.penalty).toBe(10000);
        });
    });
});
