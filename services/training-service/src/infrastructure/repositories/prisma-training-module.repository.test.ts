import { PrismaTrainingModuleRepository } from './prisma-training-module.repository';

describe('PrismaTrainingModuleRepository', () => {
  const moduleRow = {
    id: 'module-1',
    name: 'Road Safety',
    description: 'Core delivery safety training',
    contentType: 'TEXT',
    content: { type: 'TEXT', body: 'Read this' },
    durationMinutes: 20,
    category: 'safety',
    prerequisites: ['module-0'],
    targetRoles: ['COURIER'],
    isPublic: false,
    difficulty: 'BEGINNER'
  };

  it('find methods map modules and apply query filters', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([moduleRow])
      .mockResolvedValueOnce([moduleRow])
      .mockResolvedValueOnce([moduleRow])
      .mockResolvedValueOnce([moduleRow]);
    const findUnique = jest.fn().mockResolvedValue(moduleRow);
    const repo = new PrismaTrainingModuleRepository({
      trainingModule: { findMany, findUnique }
    } as never);

    const all = await repo.findAll();
    const byId = await repo.findById('module-1');
    const byCategory = await repo.findByCategory('safety');
    const withPrereq = await repo.findWithPrerequisites();
    const available = await repo.findAvailable('COURIER');

    expect(findMany).toHaveBeenNthCalledWith(1);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'module-1' } });
    expect(findMany).toHaveBeenNthCalledWith(2, { where: { category: 'safety' } });
    expect(findMany).toHaveBeenNthCalledWith(3, { where: { prerequisites: { isEmpty: false } } });
    expect(findMany).toHaveBeenNthCalledWith(4, {
      where: {
        OR: [{ isPublic: true }, { targetRoles: { has: 'COURIER' } }]
      }
    });
    expect(all[0].id).toBe('module-1');
    expect(byId?.id).toBe('module-1');
    expect(byCategory).toHaveLength(1);
    expect(withPrereq).toHaveLength(1);
    expect(available).toHaveLength(1);
  });

  it('returns null for unknown module and supports namespaced delegate fallback', async () => {
    const repo = new PrismaTrainingModuleRepository({
      training_TrainingModule: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null)
      }
    } as never);

    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('uses fallback modules when training module delegate is missing', async () => {
    const repo = new PrismaTrainingModuleRepository({} as never);

    const modules = await repo.findAll();
    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('module-default');
    expect(modules[0].name).toBe('Getting Started');
  });
});

