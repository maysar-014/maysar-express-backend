import { VelocityCheckPolicy, VelocityConfig, VelocityDecision, VelocityRiskLevel } from '../velocity-check.policy';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Money } from '../../value-objects/money.value-object';
import { ActorType } from '../../value-objects/audit-info.value-object';

describe('VelocityCheckPolicy', () => {
    const config: VelocityConfig = {
        maxTransactionsPerMinute: 5,
        maxTransactionsPerHour: 20,
        maxAmountPerHour: 10000,
        suspiciousPatternThreshold: 3
    };

    const policy = new VelocityCheckPolicy(config);

    const createTransaction = (amount: number, createdAt: Date): Transaction => {
        // Mock transaction properties
        return {
            amount: amount,
            createdAt: createdAt,
            // ... other properties not used by policy can be mocked minimally or cast
        } as unknown as Transaction;
    };

    const baseMoney = (amount: number) => Money.fromMinor(amount, 'TZS');

    describe('checkVelocity', () => {
        it('should allow low velocity request', () => {
            const result = policy.checkVelocity(
                [],
                baseMoney(100)
            );

            expect(result.decision).toBe(VelocityDecision.ALLOW);
            expect(result.riskLevel).toBe(VelocityRiskLevel.LOW);
            expect(result.riskScore).toBe(0);
        });

        it('should detect high frequency in last minute', () => {
            const now = new Date();
            const txs = [100, 101, 102, 103, 104].map(amount => createTransaction(amount, now));

            const result = policy.checkVelocity(
                txs,
                baseMoney(100)
            );

            expect(result.riskScore).toBeGreaterThanOrEqual(50);
            expect(result.reason).toContain('HIGH_FREQUENCY_MINUTE');
            expect(result.decision).toBe(VelocityDecision.CHALLENGE);
        });

        it('should detect high frequency in last hour', () => {
            const now = new Date();
            const txs = Array.from({ length: 20 }, (_, index) =>
                createTransaction(100 + index, new Date(now.getTime() - 1000 * 60 * 30))
            ); // 30 mins ago

            const result = policy.checkVelocity(
                txs,
                baseMoney(999)
            );

            expect(result.riskScore).toBeGreaterThanOrEqual(30);
            expect(result.reason).toContain('HIGH_FREQUENCY_HOUR');
            // 30 score -> LOW/MEDIUM depending on logic. Here 30 >= 20 is MEDIUM
            expect(result.riskLevel).toBe(VelocityRiskLevel.MEDIUM);
        });

        it('should detect high amount velocity', () => {
            const now = new Date();
            const txs = [createTransaction(9000, now)]; // 9000 + 1500 > 10000

            const result = policy.checkVelocity(
                txs,
                baseMoney(1500)
            );

            expect(result.riskScore).toBeGreaterThanOrEqual(40);
            expect(result.reason).toContain('HIGH_AMOUNT_VELOCITY');
        });

        it('should detect suspicious repetition pattern', () => {
            const now = new Date();
            const amount = 500;
            const txs = Array(3).fill(null).map(() => createTransaction(amount, now));

            const result = policy.checkVelocity(
                txs,
                baseMoney(amount)
            );

            expect(result.riskScore).toBeGreaterThanOrEqual(60);
            expect(result.reason).toContain('SUSPICIOUS_REPETITION');
            expect(result.decision).toBe(VelocityDecision.CHALLENGE);
        });

        it('should block critical risk', () => {
            // Trigger multiple rules to exceed 80 score
            // 1. High freq minute (50)
            // 2. High amount velocity (40)
            const now = new Date();
            const txs = Array(5).fill(null).map(() => createTransaction(2000, now)); // Total 10000, Count 5

            const result = policy.checkVelocity(
                txs,
                baseMoney(1000) // Total 11000 > 10000
            );

            // Minute freq (50) + Amount velocity (40) = 90
            expect(result.riskScore).toBeGreaterThanOrEqual(90);
            expect(result.decision).toBe(VelocityDecision.BLOCK);
            expect(result.riskLevel).toBe(VelocityRiskLevel.CRITICAL);
        });
    });
});
