import { CancellationPolicy } from '../cancellation.policy';

describe('CancellationPolicy', () => {
    let policy: CancellationPolicy;

    beforeEach(() => {
        policy = new CancellationPolicy();
    });

    const mockOrder = (status: string = 'pending') => ({
        id: 'order-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-456',
        status,
        createdAt: new Date()
    });

    describe('canCancelOrder', () => {
        it('should return error if order not found', async () => {
            const result = policy.canCancelOrder({ order: null, requestedBy: 'buyer', requesterUserId: 'buyer-123' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Order not found');
        });

        it('should allow system to always cancel', async () => {
            const result = policy.canCancelOrder({ order: mockOrder(), requestedBy: 'system' });
            expect(result.allowed).toBe(true);
        });

        it('should not allow cancellation if status is not pending or confirmed', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('shipped'), requestedBy: 'buyer', requesterUserId: 'buyer-123' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('current status');
        });

        it('should allow buyer to cancel only before seller confirms', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('pending'), requestedBy: 'buyer', requesterUserId: 'buyer-123' });
            expect(result.allowed).toBe(true);
        });

        it('should require seller consent after the order is confirmed', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('confirmed'), requestedBy: 'buyer', requesterUserId: 'buyer-123' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Seller consent is required after the order is confirmed');
            expect(result.requiresSellerConsent).toBe(true);
        });

        it('should allow the seller to issue cancellation after confirmation', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('confirmed'), requestedBy: 'seller', requesterUserId: 'seller-456' });
            expect(result.allowed).toBe(true);
        });

        it('should reject cancellation when buyer identity does not match the order creator', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('pending'), requestedBy: 'buyer', requesterUserId: 'buyer-999' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Only the buyer who created the order can cancel it');
        });

        it('should reject cancellation when seller identity does not match the order seller', async () => {
            const result = policy.canCancelOrder({ order: mockOrder('confirmed'), requestedBy: 'seller', requesterUserId: 'seller-999' });
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('Only the seller assigned to the order can issue this cancellation');
        });
    });
});
