import { Enabler_Tier } from '../types/enabler.types';
import { CommissionTier } from './commission-tier.value-object';

describe('CommissionTier', () => {
  it('creates tier config with expected rates and multipliers', () => {
    const bronze = CommissionTier.create(Enabler_Tier.BRONZE);
    const silver = CommissionTier.create(Enabler_Tier.SILVER);
    const gold = CommissionTier.create(Enabler_Tier.GOLD);
    const platinum = CommissionTier.create(Enabler_Tier.PLATINUM);

    expect(bronze.getBaseRate()).toBe(0.15);
    expect(silver.getMultiplier()).toBe(1.1);
    expect(gold.getBaseRate()).toBe(0.19);
    expect(platinum.getMultiplier()).toBe(1.3);
  });

  it('calculates effective rate with upper cap and upgrade flow', () => {
    const tier = CommissionTier.create(Enabler_Tier.GOLD);
    const platinum = CommissionTier.create(Enabler_Tier.PLATINUM);

    expect(tier.getEffectiveRate()).toBeCloseTo(0.228, 6);
    expect(tier.getEffectiveRate(2)).toBe(0.25);
    expect(tier.canUpgrade()).toBe(true);
    expect(tier.getNextTier()).toBe(Enabler_Tier.PLATINUM);
    expect(platinum.canUpgrade()).toBe(false);
    expect(platinum.getNextTier()).toBeNull();
  });

  it('supports equality/string output and rejects unknown tier', () => {
    const a = CommissionTier.create(Enabler_Tier.BRONZE);
    const b = CommissionTier.create(Enabler_Tier.BRONZE);
    const c = CommissionTier.create(Enabler_Tier.SILVER);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.toString()).toContain('BRONZE');
    expect(() => CommissionTier.create('UNKNOWN' as never)).toThrow('Unknown tier: UNKNOWN');
  });
});
