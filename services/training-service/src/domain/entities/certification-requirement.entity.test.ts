import { CertificationRequirement } from './certification-requirement.entity';

describe('CertificationRequirement', () => {
  it('creates requirement and evaluates passing/mandatory flags', () => {
    const requirement = CertificationRequirement.create({
      module: 'module-1',
      minimumScore: 75,
      validityPeriodDays: 365,
      mandatory: true,
      maxAttempts: 3
    });

    expect(requirement.module).toBe('module-1');
    expect(requirement.isPassingScore(75)).toBe(true);
    expect(requirement.isPassingScore(74)).toBe(false);
    expect(requirement.isMandatory()).toBe(true);
  });

  it('calculates expiration date from base date', () => {
    const requirement = CertificationRequirement.create({
      module: 'module-2',
      minimumScore: 60,
      validityPeriodDays: 30,
      mandatory: false,
      maxAttempts: 2
    });
    const fromDate = new Date('2026-03-08T00:00:00.000Z');

    const expiry = requirement.calculateExpirationDate(fromDate);

    expect(expiry.toISOString()).toBe('2026-04-07T00:00:00.000Z');
  });
});
