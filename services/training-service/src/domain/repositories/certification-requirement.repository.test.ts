import type { CertificationRequirement } from '../entities/certification-requirement.entity';
import type { ICertificationRequirementRepository } from './certification-requirement.repository';

describe('ICertificationRequirementRepository contract', () => {
  it('supports findAll/findByModule/findMandatory operations', async () => {
    const requirement = { id: 'req-1' } as unknown as CertificationRequirement;
    const repository: ICertificationRequirementRepository = {
      findAll: jest.fn().mockResolvedValue([requirement]),
      findByModule: jest.fn().mockResolvedValue(requirement),
      findMandatory: jest.fn().mockResolvedValue([requirement])
    };

    const all = await repository.findAll();
    const byModule = await repository.findByModule('safety');
    const mandatory = await repository.findMandatory();

    expect(all).toHaveLength(1);
    expect(byModule).toBe(requirement);
    expect(mandatory).toHaveLength(1);
  });
});
