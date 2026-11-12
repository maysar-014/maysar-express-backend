import { PrismaEnablerAttributionRepository } from './prisma-enabler-attribution.repository';

describe('PrismaEnablerAttributionRepository', () => {
  it('resolves the enabler code and returns products in current seller scope', async () => {
    const prisma: any = {
      enabler_Profile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enb_01', userId: 'user_01', status: 'ACTIVE' }),
        findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      enabler_SellerAuthorization: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'auth_01', sellerId: 'sel_01', scopeType: 'ALL_PRODUCTS', scopes: [],
          earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL', earningRuleValue: 10,
        }]),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'prd_01', sellerId: 'sel_01' }]) },
    };
    const repository = new PrismaEnablerAttributionRepository(prisma);

    await expect(repository.findByCode('ENB-123456')).resolves.toEqual({
      id: 'enb_01', userId: 'user_01', status: 'ACTIVE',
    });
    await expect(repository.getAuthorizedProductIds('enb_01', ['prd_01']))
      .resolves.toEqual(['prd_01']);
    expect(prisma.enabler_SellerAuthorization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ enablerId: 'enb_01', status: 'APPROVED' }),
    }));
  });
});
