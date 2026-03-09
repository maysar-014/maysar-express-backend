import { Weight } from './weight.value-object';

describe('Weight', () => {
  it('validates allowed range', () => {
    expect(() => Weight.create(-1)).toThrow('Weight cannot be negative');
    expect(() => Weight.create(1001)).toThrow('Weight cannot exceed 1000kg');
  });

  it('creates and converts between kilograms and pounds', () => {
    const inKg = Weight.fromKilograms(10);
    const inLbs = Weight.fromPounds(22.0462);

    expect(inKg.getUnit()).toBe('kg');
    expect(inKg.getValue()).toBe(10);
    expect(inKg.toPounds()).toBeCloseTo(22.0462, 3);
    expect(inLbs.toKilograms()).toBeCloseTo(10, 3);
    expect(inKg.equals(inLbs)).toBe(true);
    expect(inKg.toString()).toBe('10kg');
  });

  it('supports arithmetic and comparisons', () => {
    const a = Weight.create(5, 'kg');
    const b = Weight.fromPounds(11.0231);
    const total = a.add(b);

    expect(total.getUnit()).toBe('kg');
    expect(total.getValue()).toBeCloseTo(10, 2);
    expect(total.isGreaterThan(a)).toBe(true);
    expect(a.isLessThan(total)).toBe(true);
  });
});
