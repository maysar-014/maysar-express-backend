import { PayoutPolicy, PayoutSchedule } from '../payout.policy';

describe('PayoutPolicy', () => {
    let policy: PayoutPolicy;

    beforeEach(() => {
        policy = new PayoutPolicy();
    });

    describe('canPayout', () => {
        it('should allow payout when all conditions met', () => {
            const result = policy.canPayout(
                50000, // Available balance
                20000, // Requested
                'SELLER'
            );
            expect(result.canPayout).toBe(true);
            expect(result.reasons).toHaveLength(0);
        });

        it('should deny if role is ineligible', () => {
            const result = policy.canPayout(50000, 20000, 'BUYER');
            expect(result.canPayout).toBe(false);
            expect(result.reasons).toContainEqual(expect.stringContaining('not eligible'));
        });

        it('should deny if amount below minimum', () => {
            const result = policy.canPayout(50000, 5000, 'SELLER'); // Min is 10000
            expect(result.canPayout).toBe(false);
            expect(result.reasons).toContainEqual(expect.stringContaining('below minimum'));
        });

        it('should deny if insufficient funds', () => {
            const result = policy.canPayout(10000, 20000, 'SELLER');
            expect(result.canPayout).toBe(false);
            expect(result.reasons).toContainEqual(expect.stringContaining('Insufficient balance'));
        });

        it('should deny if remaining balance below minimum', () => {
            const result = policy.canPayout(
                10500, // Available
                10000, // Requested (Valid min)
                'SELLER'
            );
            // Remaining 500 < 1000 min balance
            expect(result.canPayout).toBe(false);
            expect(result.reasons).toContainEqual(expect.stringContaining('Minimum balance'));
        });

        it('should deny if next payout date in future', () => {
            const lastPayout = new Date(); // Just now
            const result = policy.canPayout(
                50000,
                20000,
                'SELLER',
                lastPayout
            );
            expect(result.canPayout).toBe(false);
            expect(result.reasons).toContainEqual(expect.stringContaining('Next payout available'));
        });
    });

    describe('calculatePayoutFee', () => {
        it('should calculate bank transfer fee', () => {
            const fee = policy.calculatePayoutFee(100000, 'BANK_TRANSFER');
            expect(fee).toBe(1000); // 1%
        });

        it('should apply min fee for bank transfer', () => {
            const fee = policy.calculatePayoutFee(10000, 'BANK_TRANSFER');
            expect(fee).toBe(500); // Min 500
        });

        it('should apply max fee for bank transfer', () => {
            const fee = policy.calculatePayoutFee(2000000, 'BANK_TRANSFER');
            expect(fee).toBe(10000); // Max 10000
        });

        it('should calculate mobile money fee', () => {
            const fee = policy.calculatePayoutFee(100000, 'MOBILE_MONEY');
            expect(fee).toBe(1500); // 1.5%
        });
    });

    describe('Schedule Logic', () => {
        it('should calculate next weekly payout date', () => {
            // Default is Weekly Friday (5)
            const date = new Date('2024-02-05T10:00:00.000Z'); // Monday
            const nextDate = policy.getNextScheduledDate(date); // Should be this Friday Feb 9th
            expect(nextDate.getDay()).toBe(5);
            expect(nextDate > date).toBe(true);
        });

        it('should calculate next daily payout date', () => {
            const localPolicy = new PayoutPolicy({ frequency: 'daily' });
            const date = new Date('2024-02-05T10:00:00.000Z');
            const nextDate = localPolicy.getNextScheduledDate(date);
            expect(nextDate.getDate()).toBe(date.getDate() + 1);
        });

        it('should calculate next monthly payout date', () => {
            const localPolicy = new PayoutPolicy({ frequency: 'monthly', dayOfMonth: 1 });
            const date = new Date('2024-02-05T10:00:00.000Z');
            const nextDate = localPolicy.getNextScheduledDate(date);
            // Should be March 1st
            expect(nextDate.getMonth()).toBe(2); // 0-indexed, Feb=1, Mar=2
            expect(nextDate.getDate()).toBe(1);
        });
    });
});
