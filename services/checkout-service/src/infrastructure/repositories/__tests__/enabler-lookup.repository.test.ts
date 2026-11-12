import { PrismaEnablerLookupRepository } from '../enabler-lookup.repository';

describe('PrismaEnablerLookupRepository seller authorization', () => {
  it('returns cart product IDs covered by a current approved authorization only', async () => {
    const prisma: any = {
      enabler_Profile: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      enabler_SellerAuthorization: {
        findMany: jest.fn().mockResolvedValue([{
          sellerId: 'sel_01', scopeType: 'CATEGORY',
          scopes: [{ scopeType: 'CATEGORY', categoryId: 'cat_01', productId: null }],
        }]),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'prd_01' }]) },
    };
    const repository = new PrismaEnablerLookupRepository(prisma);

    await expect(repository.getAuthorizedProductIds('enb_01', ['prd_01', 'prd_02']))
      .resolves.toEqual(['prd_01']);

    expect(prisma.enabler_SellerAuthorization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ enablerId: 'enb_01', status: 'APPROVED' }),
      include: { scopes: true },
    }));
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['prd_01', 'prd_02'] }, status: 'published', visibility: 'public' }),
      select: { id: true },
    }));
  });

  it('fails closed when the enabler is inactive', async () => {
    const prisma: any = {
      enabler_Profile: { findUnique: jest.fn().mockResolvedValue({ status: 'SUSPENDED' }) },
      enabler_SellerAuthorization: { findMany: jest.fn() },
      product: { findMany: jest.fn() },
    };

    await expect(new PrismaEnablerLookupRepository(prisma).getAuthorizedProductIds('enb_01', ['prd_01']))
      .resolves.toEqual([]);
    expect(prisma.enabler_SellerAuthorization.findMany).not.toHaveBeenCalled();
  });
});
