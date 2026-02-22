import { CommissionAmount, CommissionRate } from '../monetary.value-object';

describe('Monetary Value Objects', () => {
    describe('CommissionAmount', () => {
        describe('creation and validation', () => {
            it('should create a valid CommissionAmount', () => {
                const amount = new CommissionAmount(100.50);
                expect(amount.toNumber()).toBe(100.50);
                expect(amount.toString()).toBe('100.50');
            });

            it('should round to 2 decimal places', () => {
                const amount = new CommissionAmount(100.555);
                expect(amount.toNumber()).toBe(100.56);
            });

            it('should throw error for negative values', () => {
                expect(() => new CommissionAmount(-1)).toThrow('Commission amount cannot be negative');
            });

            it('should throw error for non-finite values', () => {
                expect(() => new CommissionAmount(Infinity)).toThrow('Commission amount must be a finite number');
            });
        });

        describe('operations', () => {
            it('should add amounts correctly', () => {
                const a = new CommissionAmount(100);
                const b = new CommissionAmount(50);
                const result = a.add(b);
                expect(result.toNumber()).toBe(150);
            });

            it('should subtract amounts correctly', () => {
                const a = new CommissionAmount(100);
                const b = new CommissionAmount(30);
                const result = a.subtract(b);
                expect(result.toNumber()).toBe(70);
            });

            it('should multiply by factor correctly', () => {
                const a = new CommissionAmount(100);
                const result = a.multiply(1.5);
                expect(result.toNumber()).toBe(150);
            });

            it('should compare amounts correctly', () => {
                const a = new CommissionAmount(100);
                const b = new CommissionAmount(50);
                expect(a.isGreaterThan(b)).toBe(true);
                expect(b.isGreaterThan(a)).toBe(false);
            });

            it('should detect zero correctly', () => {
                const zero = CommissionAmount.zero();
                const nonZero = new CommissionAmount(0.01);
                expect(zero.isZero()).toBe(true);
                expect(nonZero.isZero()).toBe(false);
            });
        });

        describe('static helpers', () => {
            it('should create from number', () => {
                const amount = CommissionAmount.fromNumber(75.25);
                expect(amount.toNumber()).toBe(75.25);
            });
        });
    });

    describe('CommissionRate', () => {
        describe('creation and validation', () => {
            it('should create a valid CommissionRate from decimal', () => {
                const rate = new CommissionRate(0.1);
                expect(rate.toNumber()).toBe(0.1);
                expect(rate.toPercentage()).toBe(10);
                expect(rate.toString()).toBe('10.00%');
            });

            it('should create a valid CommissionRate from percentage', () => {
                const rate = CommissionRate.fromPercentage(15);
                expect(rate.toNumber()).toBe(0.15);
            });

            it('should round to 4 decimal places', () => {
                const rate = new CommissionRate(0.123456);
                expect(rate.toNumber()).toBe(0.1235);
            });

            it('should throw error for values outside [0, 1]', () => {
                expect(() => new CommissionRate(-0.1)).toThrow('Commission rate must be between 0 and 1');
                expect(() => new CommissionRate(1.1)).toThrow('Commission rate must be between 0 and 1');
            });
        });

        describe('operations', () => {
            it('should apply rate to amount correctly', () => {
                const amount = new CommissionAmount(200);
                const rate = CommissionRate.fromPercentage(5);
                const result = rate.applyTo(amount);
                expect(result.toNumber()).toBe(10);
            });
        });
    });
});
