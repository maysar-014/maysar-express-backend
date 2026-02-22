import { LimitPolicy, LimitConfig } from '../wallet-limit.policy';
import { Money } from '../../value-objects/money.value-object';

describe('LimitPolicy', () => {
    const config: LimitConfig = {
        dailyTransactionCount: 10,
        dailyTransactionAmount: 50000,
        monthlyTransactionAmount: 200000,
        singleTransactionMax: 20000,
        minimumBalance: 1000,
        maxFrozenRatio: 0.5,
    };

    const policy = new LimitPolicy(config);

    describe('canDebit', () => {
        const baseMoney = (amount: number) => Money.fromMinor(amount, 'TZS');

        it('should allow valid debit within limits', () => {
            const amount = baseMoney(5000);
            const currentBalance = baseMoney(10000);
            const frozen = baseMoney(0);
            const dailyTotal = baseMoney(10000);
            const monthlyTotal = baseMoney(50000);

            const result = policy.canDebit(
                amount,
                currentBalance,
                frozen,
                5,
                dailyTotal,
                monthlyTotal
            );

            expect(result.allowed).toBe(true);
        });

        it('should block transaction exceeding single max', () => {
            const amount = baseMoney(25000); // > 20000
            const result = policy.canDebit(
                amount,
                baseMoney(50000),
                baseMoney(0),
                0,
                baseMoney(0),
                baseMoney(0)
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('EXCEEDS_SINGLE_TRANSACTION_LIMIT');
        });

        it('should block if resulting balance below minimum', () => {
            const amount = baseMoney(9500);
            const currentBalance = baseMoney(10000); // Remaining: 500 < 1000 min

            const result = policy.canDebit(
                amount,
                currentBalance,
                baseMoney(0),
                0,
                baseMoney(0),
                baseMoney(0)
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_FUNDS_MIN_BALANCE');
        });

        it('should block exceeding daily count', () => {
            const result = policy.canDebit(
                baseMoney(100),
                baseMoney(10000),
                baseMoney(0),
                10, // >= 10 limit
                baseMoney(0),
                baseMoney(0)
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('EXCEEDS_DAILY_COUNT_LIMIT');
        });

        it('should block exceeding daily amount', () => {
            const result = policy.canDebit(
                baseMoney(10000),
                baseMoney(50000),
                baseMoney(0),
                0,
                baseMoney(45000), // + 10000 > 50000 limit
                baseMoney(0)
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('EXCEEDS_DAILY_AMOUNT_LIMIT');
        });

        it('should block exceeding monthly amount', () => {
            const result = policy.canDebit(
                baseMoney(10000),
                baseMoney(50000),
                baseMoney(0),
                0,
                baseMoney(0),
                baseMoney(195000) // + 10000 > 200000 limit
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('EXCEEDS_MONTHLY_AMOUNT_LIMIT');
        });
    });

    describe('canFreeze', () => {
        const baseMoney = (amount: number) => Money.fromMinor(amount, 'TZS');

        it('should allow freeze within ratio', () => {
            const result = policy.canFreeze(
                baseMoney(2000),
                baseMoney(10000),
                baseMoney(2000) // Total frozen 4000/10000 = 0.4 <= 0.5
            );

            expect(result.allowed).toBe(true);
        });

        it('should block freeze exceeding ratio', () => {
            const result = policy.canFreeze(
                baseMoney(4000), // + 2000 = 6000/10000 = 0.6 > 0.5
                baseMoney(10000),
                baseMoney(2000)
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('EXCEEDS_MAX_FROZEN_RATIO');
        });
    });
});
