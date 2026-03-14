import { PrismaCategoryAttributeRepository } from './prisma-category-attribute.repository';

describe('PrismaCategoryAttributeRepository', () => {
  const makePrisma = () => ({
    categoryAttribute: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
      findFirst: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 })
    }
  });

  it('findByCategory and findById delegate to prisma', async () => {
    const prisma = makePrisma();
    prisma.categoryAttribute.findMany.mockResolvedValue([{ id: 'a1' }]);
    prisma.categoryAttribute.findUnique.mockResolvedValue({ id: 'a1' });
    const repo = new PrismaCategoryAttributeRepository(prisma as never);

    await expect(repo.findByCategory('c1')).resolves.toEqual([{ id: 'a1' }]);
    await expect(repo.findById('a1')).resolves.toEqual({ id: 'a1' });

    expect(prisma.categoryAttribute.findMany).toHaveBeenCalledWith({
      where: { categoryId: 'c1' },
      orderBy: { displayOrder: 'asc' }
    });
    expect(prisma.categoryAttribute.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' }
    });
  });

  it('save upserts category attribute', async () => {
    const prisma = makePrisma();
    const repo = new PrismaCategoryAttributeRepository(prisma as never);
    const attribute = {
      id: 'a1',
      categoryId: 'c1',
      name: 'Color',
      displayLabel: 'Color',
      type: 'SELECT',
      options: ['Red', 'Blue'],
      isRequired: true,
      displayOrder: 1,
      placeholder: 'Select color'
    };

    await repo.save(attribute);

    expect(prisma.categoryAttribute.upsert).toHaveBeenCalledWith({
      where: { id: 'a1' },
      update: expect.objectContaining({
        name: 'Color',
        placeholder: 'Select color'
      }),
      create: expect.objectContaining({
        id: 'a1',
        categoryId: 'c1'
      })
    });
  });

  it('findByCategoryAndName and deleteByCategory delegate correctly', async () => {
    const prisma = makePrisma();
    prisma.categoryAttribute.findFirst.mockResolvedValue({ id: 'a1' });
    const repo = new PrismaCategoryAttributeRepository(prisma as never);

    await expect(repo.findByCategoryAndName('c1', 'Color')).resolves.toEqual({ id: 'a1' });
    await expect(repo.deleteByCategory('c1')).resolves.toBe(2);

    expect(prisma.categoryAttribute.findFirst).toHaveBeenCalledWith({
      where: {
        categoryId: 'c1',
        name: 'Color'
      }
    });
    expect(prisma.categoryAttribute.deleteMany).toHaveBeenCalledWith({
      where: { categoryId: 'c1' }
    });
  });
});
