import { Money } from '../money.value-object';

describe('Money Value Object', () => {
    describe('Constructor', () => {
        it('should create valid money', () => {
            const money = new Money(100, 'TZS');
            expect(money.amount).toBe(100);
            expect(money.currency).toBe('TZS');
        });

        it('should round amount to 2 decimal places', () => {
            const money = new Money(100.567, 'USD');
            expect(money.amount).toBe(100.57);
        });

        it('should uppercase currency', () => {
            const money = new Money(100, 'tzs');
            expect(money.currency).toBe('TZS');
        });

        it('should throw error for non-finite amount', () => {
            expect(() => new Money(Infinity, 'TZS')).toThrow('Amount must be a finite number');
        });

        it('should throw error for missing currency', () => {
            expect(() => new Money(100, '')).toThrow('Currency is required');
        });

        it('should throw error for unsupported currency', () => {
            expect(() => new Money(100, 'XYZ')).toThrow('Unsupported currency: XYZ');
        });

        it('should throw error for invalid currency code length', () => {
            expect(() => new Money(100, 'TZ')).toThrow('Currency code must be 3 characters');
        });
    });

    describe('Arithmetic Operations', () => {
        const m1 = new Money(100, 'TZS');
        const m2 = new Money(50, 'TZS');
        const m3 = new Money(50, 'USD');

        it('should add two money values', () => {
            const result = m1.add(m2);
            expect(result.amount).toBe(150);
            expect(result.currency).toBe('TZS');
        });

        it('should throw error when adding different currencies', () => {
            expect(() => m1.add(m3)).toThrow('Currency mismatch: TZS vs USD');
        });

        it('should subtract two money values', () => {
            const result = m1.subtract(m2);
            expect(result.amount).toBe(50);
            expect(result.currency).toBe('TZS');
        });

        it('should throw error when subtracting different currencies', () => {
            expect(() => m1.subtract(m3)).toThrow('Currency mismatch: TZS vs USD');
        });

        it('should multiply by scalar', () => {
            const result = m1.multiply(2.5);
            expect(result.amount).toBe(250);
        });

        it('should throw error when multiplying by non-finite number', () => {
            expect(() => m1.multiply(Infinity)).toThrow('Multiplier must be a finite number');
        });

        it('should divide by scalar', () => {
            const result = m1.divide(2);
            expect(result.amount).toBe(50);
        });

        it('should throw error when dividing by zero', () => {
            expect(() => m1.divide(0)).toThrow('Cannot divide by zero');
        });
    });

    describe('Comparisons', () => {
        const m1 = new Money(100, 'TZS');
        const m2 = new Money(50, 'TZS');
        const m3 = new Money(100, 'TZS');
        const m4 = new Money(100, 'USD');

        it('should check if positive', () => {
            expect(m1.isPositive()).toBe(true);
            expect(new Money(-100, 'TZS').isPositive()).toBe(false);
        });

        it('should check if negative', () => {
            expect(new Money(-100, 'TZS').isNegative()).toBe(true);
            expect(m1.isNegative()).toBe(false);
        });

        it('should check if zero', () => {
            expect(new Money(0, 'TZS').isZero()).toBe(true);
            expect(m1.isZero()).toBe(false);
        });

        it('should check if greater than', () => {
            expect(m1.isGreaterThan(m2)).toBe(true);
            expect(m2.isGreaterThan(m1)).toBe(false);
        });

        it('should check if less than', () => {
            expect(m2.isLessThan(m1)).toBe(true);
            expect(m1.isLessThan(m2)).toBe(false);
        });

        it('should check equality', () => {
            expect(m1.equals(m3)).toBe(true);
            expect(m1.equals(m2)).toBe(false);
            expect(m1.equals(m4)).toBe(false);
        });
    });

    describe('Allocation', () => {
        it('should allocate money proportionally', () => {
            const money = new Money(100, 'TZS');
            const allocations = money.allocate([50, 50]);
            expect(allocations.length).toBe(2);
            expect(allocations[0].amount).toBe(50);
            expect(allocations[1].amount).toBe(50);
        });

        it('should handle uneven allocation with remainder', () => {
            // 100 / 3 = 33.33...
            const money = new Money(100, 'TZS');
            const allocations = money.allocate([1, 1, 1]);
            // 33.33, 33.33, 33.34 (remainder added to last)
            expect(allocations[0].amount).toBe(33.33);
            expect(allocations[1].amount).toBe(33.33);
            expect(allocations[2].amount).toBe(33.34);

            const sum = allocations.reduce((acc, curr) => acc + curr.amount, 0);
            expect(sum).toBe(100);
        });

        it('should throw error for empty ratios', () => {
            const money = new Money(100, 'TZS');
            expect(() => money.allocate([])).toThrow('At least one ratio is required');
        });
    });

    describe('Formatting & Conversion', () => {
        const money = new Money(1234.56, 'TZS');

        it('should format money', () => {
            expect(money.format()).toBe('TZS 1234.56');
        });

        it('should convert to object', () => {
            expect(money.toObject()).toEqual({ amount: 1234.56, currency: 'TZS' });
        });

        it('should create from minor units', () => {
            const m = Money.fromMinorUnits(1000, 'TZS');
            expect(m.amount).toBe(10);
        });

        it('should convert to minor units', () => {
            expect(money.toMinorUnits()).toBe(123456);
        });
    });
});
