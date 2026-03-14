jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-id')
}));

import { PrismaProductAttributeRepository } from './prisma-product-attribute.repository';

describe('PrismaProductAttributeRepository', () => {
  const makePrisma = () => ({
    productAttribute: {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn(),
      findFirst: jest.fn()
    }
  });

  it('saveAll returns early when attributes list is empty', async () => {
    const prisma = makePrisma();
    const repo = new PrismaProductAttributeRepository(prisma as never);

    await repo.saveAll('p1', []);

    expect(prisma.productAttribute.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productAttribute.createMany).not.toHaveBeenCalled();
  });

  it('saveAll replaces existing attributes', async () => {
    const prisma = makePrisma();
    const repo = new PrismaProductAttributeRepository(prisma as never);

    await repo.saveAll('p1', [
      { attributeId: 'a1', value: 'red' },
      { attributeId: 'a2', value: 'xl' }
    ]);

    expect(prisma.productAttribute.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'p1' }
    });
    expect(prisma.productAttribute.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: 'generated-id',
          productId: 'p1',
          attributeId: 'a1',
          value: 'red',
          createdAt: expect.any(Date)
        },
        {
          id: 'generated-id',
          productId: 'p1',
          attributeId: 'a2',
          value: 'xl',
          createdAt: expect.any(Date)
        }
      ]
    });
  });

  it('findByProduct, findByProductAndAttribute and deleteByProduct delegate to prisma', async () => {
    const prisma = makePrisma();
    prisma.productAttribute.findMany.mockResolvedValue([{ id: 'x' }]);
    prisma.productAttribute.findFirst.mockResolvedValue({ id: 'x' });
    const repo = new PrismaProductAttributeRepository(prisma as never);

    await expect(repo.findByProduct('p1')).resolves.toEqual([{ id: 'x' }]);
    await expect(repo.findByProductAndAttribute('p1', 'a1')).resolves.toEqual({ id: 'x' });
    await expect(repo.deleteByProduct('p1')).resolves.toBe(2);
  });
});
