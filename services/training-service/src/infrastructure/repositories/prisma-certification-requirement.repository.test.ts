import { PrismaCertificationRequirementRepository } from './prisma-certification-requirement.repository';

describe('PrismaCertificationRequirementRepository', () => {
  it('maps persistence rows to domain requirements', async () => {
    const row = {
      module: 'module-1',
      minimumScore: 70,
      validityPeriodDays: 365,
      mandatory: true,
      maxAttempts: 3
    };
    const findMany = jest.fn().mockResolvedValue([row]);
    const findUnique = jest.fn().mockResolvedValue(row);
    const repo = new PrismaCertificationRequirementRepository({
      certificationRequirement: { findMany, findUnique }
    } as never);

    const all = await repo.findAll();
    const byModule = await repo.findByModule('module-1');
    const mandatory = await repo.findMandatory();

    expect(all[0].module).toBe('module-1');
    expect(byModule?.minimumScore).toBe(70);
    expect(findMany).toHaveBeenNthCalledWith(1);
    expect(findMany).toHaveBeenNthCalledWith(2, { where: { mandatory: true } });
    expect(mandatory[0].mandatory).toBe(true);
  });

  it('returns null for unknown module and throws if delegate missing', async () => {
    const repoWithNull = new PrismaCertificationRequirementRepository({
      certificationRequirement: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null)
      }
    } as never);

    await expect(repoWithNull.findByModule('missing-module')).resolves.toBeNull();

    const repoWithoutDelegate = new PrismaCertificationRequirementRepository({} as never);
    await expect(repoWithoutDelegate.findAll()).rejects.toThrow(
      'Certification requirement delegate is not configured on prisma client'
    );
  });
});
