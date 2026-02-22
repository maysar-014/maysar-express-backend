import { Money } from '../money.value-object';

describe('Money Value Object', () => {
    describe('Creation', () => {
        it('should create from minor units', () => {
            const money = Money.fromMinor(1000, 'TZS');
            expect(money.amount).toBe(1000);
            expect(money.currency).toBe('TZS');
        });

        it('should create from major units', () => {
            const money = Money.fromMajor(10.50, 'USD');
            expect(money.amount).toBe(1050);
            expect(money.currency).toBe('USD');
        });

        it('should create zero amount', () => {
            const money = Money.zero('TZS');
            expect(money.amount).toBe(0);
            expect(money.currency).toBe('TZS');
        });

        it('should throw error for non-integer minor units', () => {
            expect(() => Money.fromMinor(10.5, 'TZS')).toThrow('Money amount must be an integer');
        });
    });

    describe('Operations', () => {
        it('should add money of same currency', () => {
            const m1 = Money.fromMinor(1000, 'TZS');
            const m2 = Money.fromMinor(500, 'TZS');
            const result = m1.add(m2);
            expect(result.amount).toBe(1500);
            expect(result.currency).toBe('TZS');
        });

        it('should throw error when adding different currencies', () => {
            const m1 = Money.fromMinor(1000, 'TZS');
            const m2 = Money.fromMinor(500, 'USD');
            expect(() => m1.add(m2)).toThrow('Currency mismatch');
        });

        it('should subtract money of same currency', () => {
            const m1 = Money.fromMinor(1000, 'TZS');
            const m2 = Money.fromMinor(500, 'TZS');
            const result = m1.subtract(m2);
            expect(result.amount).toBe(500);
        });

        it('should throw error when subtracting different currencies', () => {
            const m1 = Money.fromMinor(1000, 'TZS');
            const m2 = Money.fromMinor(500, 'USD');
            expect(() => m1.subtract(m2)).toThrow('Currency mismatch');
        });

        it('should multiply by factor', () => {
            const m1 = Money.fromMinor(1000, 'TZS');
            const result = m1.multiply(1.5);
            expect(result.amount).toBe(1500);
        });

        it('should round result when multiplying', () => {
            const m1 = Money.fromMinor(10, 'TZS');
            const result = m1.multiply(0.33); // 3.3 -> 3
            expect(result.amount).toBe(3);
        });
    });

    describe('Comparison', () => {
        const m100 = Money.fromMinor(100, 'TZS');
        const m200 = Money.fromMinor(200, 'TZS');
        const m100USD = Money.fromMinor(100, 'USD');

        it('should compare using isGreaterThan', () => {
            expect(m200.isGreaterThan(m100)).toBe(true);
            expect(m100.isGreaterThan(m200)).toBe(false);
            expect(m100.isGreaterThan(m100)).toBe(false);
        });

        it('should compare using isLessThan', () => {
            expect(m100.isLessThan(m200)).toBe(true);
            expect(m200.isLessThan(m100)).toBe(false);
            expect(m100.isLessThan(m100)).toBe(false);
        });

        it('should compare using isGreaterThanOrEqual', () => {
            expect(m200.isGreaterThanOrEqual(m100)).toBe(true);
            expect(m100.isGreaterThanOrEqual(m100)).toBe(true);
            expect(m100.isGreaterThanOrEqual(m200)).toBe(false);
        });

        it('should compare using equals', () => {
            const m100Copy = Money.fromMinor(100, 'TZS');
            expect(m100.equals(m100Copy)).toBe(true);
            expect(m100.equals(m200)).toBe(false);
            expect(m100.equals(m100USD)).toBe(false);
        });

        it('should throw error when comparing different currencies', () => {
            expect(() => m100.isGreaterThan(m100USD)).toThrow('Currency mismatch');
        });
    });

    describe('Conversion', () => {
        it('should convert to major units', () => {
            const m = Money.fromMinor(1050, 'TZS');
            expect(m.toMajor()).toBe(10.50);
        });
    });
});
