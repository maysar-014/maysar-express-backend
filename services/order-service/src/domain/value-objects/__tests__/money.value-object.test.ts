import { Money } from '../money.value-object';

describe('Money Value Object', () => {
    describe('Creation', () => {
        it('should create valid money', () => {
            const m = new Money(100, 'TZS');
            expect(m.amount).toBe(100);
            expect(m.currency).toBe('TZS');
        });

        it('should throw error for negative amount', () => {
            expect(() => new Money(-1, 'TZS')).toThrow('Amount cannot be negative');
        });

        it('should throw error if currency missing', () => {
            expect(() => new Money(100, '')).toThrow('Currency is required');
        });
    });

    describe('Operations', () => {
        it('should add money of same currency', () => {
            const m1 = new Money(100, 'TZS');
            const m2 = new Money(50, 'TZS');
            expect(m1.add(m2).amount).toBe(150);
        });

        it('should multiply', () => {
            const m = new Money(100, 'TZS');
            expect(m.multiply(2).amount).toBe(200);
        });

        it('should format string', () => {
            const m = new Money(100.5, 'TZS');
            expect(m.toString()).toBe('TZS 100.50');
        });
    });
});
