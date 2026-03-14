import { PrismaMatchConfirmationRepository } from './prisma-match-confirmation.repository';

describe('PrismaMatchConfirmationRepository', () => {
  const makePrisma = () => ({
    catalog_MatchConfirmation: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    }
  });

  it('saves confirmation', async () => {
    const prisma = makePrisma();
    const repo = new PrismaMatchConfirmationRepository(prisma as never);
    const confirmation = {
      id: 'c1',
      auditId: 'a1',
      sellerId: 's1',
      candidateProducts: ['p1'],
      status: 'PENDING',
      sellerChoice: null,
      expiresAt: new Date('2026-03-10T00:00:00.000Z'),
      respondedAt: null,
      createdAt: new Date('2026-03-09T00:00:00.000Z')
    };

    await repo.save(confirmation as any);

    expect(prisma.catalog_MatchConfirmation.create).toHaveBeenCalledWith({
      data: confirmation
    });
  });

  it('findById returns mapped confirmation or null', async () => {
    const prisma = makePrisma();
    prisma.catalog_MatchConfirmation.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        auditId: 'a1',
        sellerId: 's1',
        candidateProducts: ['p1'],
        status: 'PENDING',
        sellerChoice: null,
        expiresAt: new Date('2026-03-10T00:00:00.000Z'),
        respondedAt: null,
        createdAt: new Date('2026-03-09T00:00:00.000Z')
      })
      .mockResolvedValueOnce(null);
    const repo = new PrismaMatchConfirmationRepository(prisma as never);

    await expect(repo.findById('c1')).resolves.toEqual(expect.objectContaining({ id: 'c1' }));
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findPendingBySeller, updateStatus and findExpired delegate correctly', async () => {
    const prisma = makePrisma();
    prisma.catalog_MatchConfirmation.findMany
      .mockResolvedValueOnce([{ id: 'c1', status: 'PENDING', candidateProducts: [] }])
      .mockResolvedValueOnce([{ id: 'c2', status: 'PENDING', candidateProducts: [] }]);
    const repo = new PrismaMatchConfirmationRepository(prisma as never);

    await repo.findPendingBySeller('s1');
    await repo.updateStatus('c1', 'CONFIRMED', 'p1');
    await repo.findExpired();

    expect(prisma.catalog_MatchConfirmation.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        sellerId: 's1',
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(prisma.catalog_MatchConfirmation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        status: 'CONFIRMED',
        sellerChoice: 'p1',
        respondedAt: expect.any(Date)
      }
    });
    expect(prisma.catalog_MatchConfirmation.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: 'PENDING',
        expiresAt: { lt: expect.any(Date) }
      }
    });
  });
});
