import { CategoryGuardService } from './category-guard.service';

describe('CategoryGuardService', () => {
  it('caps price when it exceeds category multiplier', () => {
    const service = new CategoryGuardService();

    const result = service.enforce(2_000, 500, 'electronics');

    expect(result.price).toBe(1_500);
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0]).toContain('electronics');
  });

  it('uses default cap when category is unknown', () => {
    const service = new CategoryGuardService();

    const result = service.enforce(3_000, 700, 'unknown-category');

    expect(result.price).toBe(2_800);
    expect(result.adjustments[0]).toContain('unknown-category');
  });

  it('keeps original price when within cap', () => {
    const service = new CategoryGuardService();

    const result = service.enforce(1_200, 500, 'food');

    expect(result.price).toBe(1_200);
    expect(result.adjustments).toEqual([]);
  });
});
