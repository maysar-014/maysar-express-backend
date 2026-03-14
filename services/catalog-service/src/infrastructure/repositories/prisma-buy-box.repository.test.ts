import { BuyBoxResult } from '../../domain/value-objects/buy-box-result.value-object';
import { PrismaBuyBoxRepository } from './prisma-buy-box.repository';

describe('PrismaBuyBoxRepository', () => {
  it('updates existing buy box and replaces alternatives', async () => {
    const tx = {
      buyBox: {
        findUnique: jest.fn().mockResolvedValue({ id: 'bb1' }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn()
      },
      catalog_BuyBoxAlternative: {
        deleteMany: jest.fn().mockResolvedValue(undefined)
      }
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      buyBox: { findUnique: jest.fn(), deleteMany: jest.fn() }
    };
    const repo = new PrismaBuyBoxRepository(prisma as never);
    const result = new BuyBoxResult(
      'p1',
      's1',
      0.9,
      [{ sellerId: 's2', score: 0.8, rank: 2 }],
      new Date('2026-03-09T00:00:00.000Z')
    );

    await repo.save(result);

    expect(tx.buyBox.findUnique).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(tx.catalog_BuyBoxAlternative.deleteMany).toHaveBeenCalledWith({
      where: { buyBoxId: 'bb1' }
    });
    expect(tx.buyBox.update).toHaveBeenCalledWith({
      where: { id: 'bb1' },
      data: expect.objectContaining({
        primarySellerId: 's1',
        alternatives: {
          create: [{ sellerId: 's2', score: 0.8, rank: 2 }]
        }
      })
    });
  });

  it('creates buy box when existing record is missing', async () => {
    const tx = {
      buyBox: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined)
      },
      catalog_BuyBoxAlternative: {
        deleteMany: jest.fn()
      }
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      buyBox: { findUnique: jest.fn(), deleteMany: jest.fn() }
    };
    const repo = new PrismaBuyBoxRepository(prisma as never);

    await repo.save(
      new BuyBoxResult('p1', 's1', 0.9, [{ sellerId: 's2', score: 0.8, rank: 2 }], new Date())
    );

    expect(tx.buyBox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'p1',
        primarySellerId: 's1'
      })
    });
  });

  it('findByProductId maps decimals and deleteByProductId delegates', async () => {
    const prisma = {
      $transaction: jest.fn(),
      buyBox: {
        findUnique: jest.fn().mockResolvedValue({
          productId: 'p1',
          primarySellerId: 's1',
          primaryScore: { toNumber: () => 0.95 },
          alternatives: [{ sellerId: 's2', score: { toNumber: () => 0.8 }, rank: 2 }],
          lastComputedAt: new Date('2026-03-09T00:00:00.000Z')
        }),
        deleteMany: jest.fn().mockResolvedValue(undefined)
      }
    };
    const repo = new PrismaBuyBoxRepository(prisma as never);

    const found = await repo.findByProductId('p1');
    await repo.deleteByProductId('p1');

    expect(found).toEqual(
      new BuyBoxResult(
        'p1',
        's1',
        0.95,
        [{ sellerId: 's2', score: 0.8, rank: 2 }],
        new Date('2026-03-09T00:00:00.000Z')
      )
    );
    expect(prisma.buyBox.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
  });
});
