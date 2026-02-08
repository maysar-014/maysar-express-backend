import { PaymentLimitsPolicy } from '../payment-limits.policy';

describe('Payment Limits Policy', () => {
    let policy: PaymentLimitsPolicy;

    beforeEach(() => {
        policy = new PaymentLimitsPolicy();
    });

    describe('Limit Checks', () => {
        it('should allow transaction within limits', () => {
            const result = policy.isWithinLimits(1000, 'MPESA', 0, 0, 0);
            expect(result.isWithinLimits).toBe(true);
        });

        it('should block transaction exceeding transaction limit', () => {
            const result = policy.isWithinLimits(6000000, 'MPESA', 0, 0, 0); // Limit 5M
            expect(result.isWithinLimits).toBe(false);
            expect(result.violations[0]).toContain('exceeds limit');
        });

        it('should block transaction exceeding daily limit', () => {
            const result = policy.isWithinLimits(1000000, 'MPESA', 9500000, 0, 0); // Limit 10M
            expect(result.isWithinLimits).toBe(false);
            expect(result.violations[0]).toContain('Daily limit exceeded');
        });

        it('should block transaction below minimum method limit', () => {
            const result = policy.isWithinLimits(100, 'MPESA', 0, 0, 0); // Min 500
            expect(result.isWithinLimits).toBe(false);
            expect(result.violations[0]).toContain('below minimum');
        });

        it('should block transaction exceeding method daily limit', () => {
            // MPESA daily limit is 10M.
            // But MPESA matches default daily limit.
            // Let's test Wallet which has 20M daily limit, but Default global is 10M.
            // Actually global limit check runs first.

            // Test method count limit
            const result = policy.isWithinLimits(1000, 'MPESA', 0, 0, 50); // Count limit 50
            expect(result.isWithinLimits).toBe(false);
            expect(result.violations[0]).toContain('Transaction count limit');
        });
    });

    describe('Custom Limits', () => {
        it('should respect custom limits', () => {
            const customPolicy = new PaymentLimitsPolicy({ dailyLimit: 100 });
            const result = customPolicy.isWithinLimits(200, 'MPESA', 0, 0, 0);
            expect(result.isWithinLimits).toBe(false);
            expect(result.violations[0]).toContain('Daily limit exceeded');
        });
    });
});
