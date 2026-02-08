import { RefundPolicy } from '../refund.policy';

describe('Refund Policy', () => {
    let policy: RefundPolicy;

    beforeEach(() => {
        policy = new RefundPolicy();
    });

    describe('Eligibility', () => {
        it('should allow full refund within window', () => {
            const paymentDate = new Date();
            const eligibility = policy.canRefund('COMPLETED', 1000, 0, paymentDate);
            expect(eligibility.canRefund).toBe(true);
            expect(eligibility.refundableAmount).toBe(1000);
        });

        it('should allow partial refund within window', () => {
            // 8 days ago (default full refund is 7 days)
            const paymentDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
            const eligibility = policy.canRefund('COMPLETED', 1000, 0, paymentDate);
            expect(eligibility.canRefund).toBe(true);
            expect(eligibility.refundableAmount).toBe(800); // 80%
        });

        it('should reject refund after window', () => {
            // 31 days ago (default no refund after 30 days)
            const paymentDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
            const eligibility = policy.canRefund('COMPLETED', 1000, 0, paymentDate);
            expect(eligibility.canRefund).toBe(false);
            expect(eligibility.reasons[0]).toContain('window expired');
        });

        it('should reject non-completed payment', () => {
            const eligibility = policy.canRefund('PENDING', 1000, 0, new Date());
            expect(eligibility.canRefund).toBe(false);
            expect(eligibility.reasons[0]).toContain('must be completed');
        });

        it('should reject already fully refunded', () => {
            const eligibility = policy.canRefund('COMPLETED', 1000, 1000, new Date());
            expect(eligibility.canRefund).toBe(false);
            expect(eligibility.reasons[0]).toContain('already been fully refunded');
        });
    });

    describe('Order Status', () => {
        it('should reject non-refundable order status', () => {
            const eligibility = policy.canRefund('COMPLETED', 1000, 0, new Date(), 'DELIVERED'); // Delivered not in default allowed list?
            // checking source: PENDING, CONFIRMED, PROCESSING, CANCELLED, FAILED. DELIVERED is missing.
            expect(eligibility.canRefund).toBe(false);
            expect(eligibility.reasons[0]).toContain('not refundable');
        });

        it('should allow refundable order status', () => {
            const eligibility = policy.canRefund('COMPLETED', 1000, 0, new Date(), 'CANCELLED');
            expect(eligibility.canRefund).toBe(true);
        });
    });
});
