import { PrismaProductMatchAuditRepository } from './prisma-product-match-audit.repository';

describe('PrismaProductMatchAuditRepository', () => {
  const makePrisma = () => ({
    catalog_ProductMatchAudit: {
      upsert: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      findMany: jest.fn()
    }
  });

  it('saves audit via upsert', async () => {
    const prisma = makePrisma();
    const repo = new PrismaProductMatchAuditRepository(prisma as never);
    const audit = {
      id: 'a1',
      candidateProductId: 'cp1',
      matchedProductId: 'mp1',
      matchLevel: 'HIGH',
      matchScore: 0.95,
      matchingCriteria: { name: true },
      decision: 'SELLER_CONFIRMED',
      decidedBy: 'SELLER',
      sellerId: 's1',
      metadata: { foo: 'bar' },
      createdAt: new Date('2026-03-09T00:00:00.000Z')
    };

    await repo.save(audit as any);

    expect(prisma.catalog_ProductMatchAudit.upsert).toHaveBeenCalledWith({
      where: { id: 'a1' },
      create: expect.objectContaining({
        id: 'a1',
        candidateProductId: 'cp1',
        matchedProductId: 'mp1'
      }),
      update: expect.objectContaining({
        decision: 'SELLER_CONFIRMED',
        decidedBy: 'SELLER',
        metadata: { foo: 'bar' }
      })
    });
  });

  it('findById returns mapped domain audit or null', async () => {
    const prisma = makePrisma();
    prisma.catalog_ProductMatchAudit.findUnique.mockResolvedValueOnce({
      id: 'a1',
      candidateProductId: 'cp1',
      matchedProductId: 'mp1',
      matchLevel: 'HIGH',
      matchScore: '0.5',
      matchingCriteria: {},
      decision: 'AUTO',
      decidedBy: 'SYSTEM',
      sellerId: 's1',
      metadata: null,
      createdAt: new Date('2026-03-09T00:00:00.000Z')
    });
    prisma.catalog_ProductMatchAudit.findUnique.mockResolvedValueOnce(null);
    const repo = new PrismaProductMatchAuditRepository(prisma as never);

    await expect(repo.findById('a1')).resolves.toEqual(
      expect.objectContaining({
        id: 'a1',
        matchScore: 0.5
      })
    );
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findBySeller and findByMatchLevel return mapped records', async () => {
    const prisma = makePrisma();
    prisma.catalog_ProductMatchAudit.findMany
      .mockResolvedValueOnce([
        {
          id: 'a1',
          candidateProductId: 'cp1',
          matchedProductId: null,
          matchLevel: 'MEDIUM',
          matchScore: '0.7',
          matchingCriteria: {},
          decision: 'PENDING',
          decidedBy: null,
          sellerId: 's1',
          metadata: {},
          createdAt: new Date('2026-03-09T00:00:00.000Z')
        }
      ])
      .mockResolvedValueOnce([]);
    const repo = new PrismaProductMatchAuditRepository(prisma as never);

    const bySeller = await repo.findBySeller('s1', 10);
    const byLevel = await repo.findByMatchLevel('HIGH');

    expect(prisma.catalog_ProductMatchAudit.findMany).toHaveBeenNthCalledWith(1, {
      where: { sellerId: 's1' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    expect(prisma.catalog_ProductMatchAudit.findMany).toHaveBeenNthCalledWith(2, {
      where: { matchLevel: 'HIGH' },
      orderBy: { createdAt: 'desc' }
    });
    expect(bySeller[0].matchScore).toBe(0.7);
    expect(byLevel).toEqual([]);
  });
});
