import { Money } from '../money.value-object';

describe('Money', () => {
    it('should create money', () => {
        const money = Money.create(100, 'USD');
        expect(money.getAmount()).toBe(100);
        expect(money.getCurrency()).toBe('USD');
    });

    it('should add money', () => {
        const m1 = Money.create(100, 'USD');
        const m2 = Money.create(50, 'USD');
        const result = m1.add(m2);
        expect(result.getAmount()).toBe(150);
    });

    it('should throw on currency mismatch', () => {
        const m1 = Money.create(100, 'USD');
        const m2 = Money.create(50, 'EUR');
        expect(() => m1.add(m2)).toThrow();
    });
});
