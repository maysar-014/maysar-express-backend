import { ProductionCapacity } from './production-capacity.value-object';

describe('ProductionCapacity', () => {
  it('calculates availability and utilization correctly', () => {
    const capacity = new ProductionCapacity({
      maxCapacity: 100,
      usedCapacity: 30,
      reservedCapacity: 20,
      unit: 'units'
    });

    expect(capacity.availableCapacity).toBe(50);
    expect(capacity.utilizationRate).toBe(50);
    expect(capacity.isAvailable(40)).toBe(true);
    expect(capacity.isAvailable(60)).toBe(false);
  });

  it('allocates reserved amount immutably', () => {
    const capacity = new ProductionCapacity({
      maxCapacity: 100,
      usedCapacity: 30,
      reservedCapacity: 20,
      unit: 'units'
    });

    const updated = capacity.allocate(10);
    expect(updated.reservedCapacity).toBe(30);
    expect(capacity.reservedCapacity).toBe(20);
    expect(() => capacity.allocate(51)).toThrow('Insufficient capacity');
  });

  it('validates invalid capacity inputs', () => {
    expect(() =>
      new ProductionCapacity({ maxCapacity: -1, usedCapacity: 0, reservedCapacity: 0, unit: 'units' })
    ).toThrow('Max capacity cannot be negative');
    expect(() =>
      new ProductionCapacity({ maxCapacity: 10, usedCapacity: -1, reservedCapacity: 0, unit: 'units' })
    ).toThrow('Used or reserved capacity cannot be negative');
    expect(() =>
      new ProductionCapacity({ maxCapacity: 10, usedCapacity: 6, reservedCapacity: 5, unit: 'units' })
    ).toThrow('Total utilization cannot exceed max capacity');
  });
});
