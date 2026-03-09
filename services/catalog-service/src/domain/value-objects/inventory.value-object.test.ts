import { InventoryLevel, InventoryTurnover, ReorderPoint, SafetyStock } from './inventory.value-object';

describe('inventory value objects', () => {
  it('stores inventory level fields', () => {
    const level = new InventoryLevel(40, 10, 100);
    expect(level.current).toBe(40);
    expect(level.minimum).toBe(10);
    expect(level.maximum).toBe(100);
  });

  it('stores reorder point and safety stock fields', () => {
    const reorder = new ReorderPoint(20, 15);
    const safety = new SafetyStock(8, 5);

    expect(reorder.value).toBe(20);
    expect(reorder.threshold).toBe(15);
    expect(safety.current).toBe(8);
    expect(safety.minimum).toBe(5);
  });

  it('stores turnover ratios', () => {
    const turnover = new InventoryTurnover(2.4, 3.0);
    expect(turnover.ratio).toBeCloseTo(2.4, 6);
    expect(turnover.targetRatio).toBe(3);
  });
});
