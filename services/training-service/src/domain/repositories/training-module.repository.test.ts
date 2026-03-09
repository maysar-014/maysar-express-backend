import type { TrainingModule } from '../entities/training-module.entity';
import type { ITrainingModuleRepository } from './training-module.repository';

describe('ITrainingModuleRepository contract', () => {
  it('supports module query methods', async () => {
    const module = { id: 'module-1' } as unknown as TrainingModule;
    const repository: ITrainingModuleRepository = {
      findAll: jest.fn().mockResolvedValue([module]),
      findById: jest.fn().mockResolvedValue(module),
      findByCategory: jest.fn().mockResolvedValue([module]),
      findWithPrerequisites: jest.fn().mockResolvedValue([module]),
      findAvailable: jest.fn().mockResolvedValue([module])
    };

    expect((await repository.findAll()).length).toBe(1);
    expect(await repository.findById('module-1')).toBe(module);
    expect((await repository.findByCategory('safety')).length).toBe(1);
    expect((await repository.findWithPrerequisites()).length).toBe(1);
    expect((await repository.findAvailable('courier')).length).toBe(1);
  });
});
