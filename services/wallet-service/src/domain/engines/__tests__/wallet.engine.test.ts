import { WalletEngine } from '../wallet.engine';

describe('WalletEngine', () => {
    const engine = new WalletEngine();

    describe('calculateAvailableBalance', () => {
        it('should return correct available balance', () => {
            expect(engine.calculateAvailableBalance(1000, 200)).toBe(800);
        });

        it('should throw error for negative total balance', () => {
            expect(() => engine.calculateAvailableBalance(-100, 0)).toThrow('Total balance cannot be negative');
        });

        it('should throw error for negative frozen amount', () => {
            expect(() => engine.calculateAvailableBalance(100, -50)).toThrow('Frozen amount cannot be negative');
        });

        it('should throw error when frozen exceeds total', () => {
            expect(() => engine.calculateAvailableBalance(100, 150)).toThrow('Frozen amount cannot exceed total balance');
        });
    });

    describe('validateTransaction', () => {
        it('should validate valid transaction', () => {
            const result = engine.validateTransaction(1000, 200, 500);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return error for insufficient funds', () => {
            const result = engine.validateTransaction(1000, 200, 900); // Avail: 800
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('Insufficient available balance'));
        });

        it('should return error for negative amount', () => {
            const result = engine.validateTransaction(1000, 0, -100);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Transaction amount must be positive');
        });
    });

    describe('optimizeTransfer', () => {
        it('should allow transfer if sufficient funds', () => {
            const result = engine.optimizeTransfer(1000, 0, 500);
            expect(result.canTransfer).toBe(true);
        });

        it('should suggest available amount if insufficient', () => {
            const result = engine.optimizeTransfer(1000, 0, 1500);
            expect(result.canTransfer).toBe(false);
            expect(result.suggestedAmount).toBe(1000);
        });

        it('should not suggest amount if zero balance', () => {
            const result = engine.optimizeTransfer(0, 0, 100);
            expect(result.canTransfer).toBe(false);
            expect(result.suggestedAmount).toBeUndefined();
        });
    });

    describe('calculateBalanceAfterCredit', () => {
        it('should add valid credit', () => {
            expect(engine.calculateBalanceAfterCredit(1000, 500)).toBe(1500);
        });

        it('should throw error for negative credit', () => {
            expect(() => engine.calculateBalanceAfterCredit(1000, -100)).toThrow('Credit amount must be positive');
        });
    });

    describe('calculateBalanceAfterDebit', () => {
        it('should subtract valid debit', () => {
            expect(engine.calculateBalanceAfterDebit(1000, 0, 500)).toBe(500);
        });

        it('should throw error for negative debit', () => {
            expect(() => engine.calculateBalanceAfterDebit(1000, 0, -100)).toThrow('Debit amount must be positive');
        });

        it('should throw error for insufficient funds', () => {
            expect(() => engine.calculateBalanceAfterDebit(1000, 500, 600)).toThrow('Insufficient balance');
        });
    });

    describe('calculateFrozenAmountAfterFreeze', () => {
        it('should increase frozen amount', () => {
            expect(engine.calculateFrozenAmountAfterFreeze(1000, 0, 500)).toBe(500);
        });

        it('should throw error for negative freeze', () => {
            expect(() => engine.calculateFrozenAmountAfterFreeze(1000, 0, -100)).toThrow('Freeze amount must be positive');
        });

        it('should throw error if freeze exceeds available', () => {
            expect(() => engine.calculateFrozenAmountAfterFreeze(1000, 500, 600)).toThrow('Cannot freeze');
        });
    });

    describe('calculateFrozenAmountAfterUnfreeze', () => {
        it('should decrease frozen amount', () => {
            expect(engine.calculateFrozenAmountAfterUnfreeze(500, 200)).toBe(300);
        });

        it('should throw error for negative unfreeze', () => {
            expect(() => engine.calculateFrozenAmountAfterUnfreeze(500, -100)).toThrow('Unfreeze amount must be positive');
        });

        it('should throw error if unfreeze exceeds frozen', () => {
            expect(() => engine.calculateFrozenAmountAfterUnfreeze(200, 300)).toThrow('Cannot unfreeze');
        });
    });

    describe('calculateAfterDebitFrozen', () => {
        it('should decrease both balance and frozen', () => {
            const result = engine.calculateAfterDebitFrozen(1000, 500, 200);
            expect(result.newBalance).toBe(800);
            expect(result.newFrozenAmount).toBe(300);
        });

        it('should throw error if debit exceeds frozen', () => {
            expect(() => engine.calculateAfterDebitFrozen(1000, 500, 600)).toThrow('Cannot debit');
        });
    });

    describe('validateWalletState', () => {
        it('should validate correct state', () => {
            const result = engine.validateWalletState(1000, 500);
            expect(result.isValid).toBe(true);
        });

        it('should invalidate negative balance', () => {
            const result = engine.validateWalletState(-100, 0);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Balance cannot be negative');
        });

        it('should invalidate frozen > balance', () => {
            const result = engine.validateWalletState(100, 200);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Frozen amount cannot exceed balance');
        });
    });

    describe('calculateWalletHealth', () => {
        it('should return perfect score for healthy wallet', () => {
            expect(engine.calculateWalletHealth(10000, 0, 10, 0)).toBe(100);
        });

        it('should deduct points for high frozen ratio', () => {
            // > 50% frozen -> -20
            expect(engine.calculateWalletHealth(1000, 600, 10, 0)).toBe(80);
        });

        it('should deduct points for failed transactions', () => {
            // > 30% fail -> -30
            expect(engine.calculateWalletHealth(1000, 0, 10, 4)).toBe(70);
        });

        it('should deduct points for low balance', () => {
            // < 1000 -> -10
            expect(engine.calculateWalletHealth(500, 0, 10, 0)).toBe(90);
        });

        it('should clamp score between 0 and 100', () => {
            // worst case
            expect(engine.calculateWalletHealth(500, 400, 10, 5)).toBeGreaterThanOrEqual(0);
        });
    });
});
