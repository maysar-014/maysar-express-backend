import { databaseManager } from '../../config/database.config';

export interface OrderEnablerAttributionRepository {
  findByCode(code: string): Promise<{ id: string; userId: string; status: string } | null>;
  getAuthorizedProductIds(enablerId: string, productIds: string[]): Promise<string[]>;
  getAuthorizedProductTerms(enablerId: string, productIds: string[]): Promise<Array<{
    productId: string; sellerId: string; authorizationId: string; earningRuleType: string; earningRuleValue: number;
  }>>;
}

export class PrismaEnablerAttributionRepository implements OrderEnablerAttributionRepository {
  constructor(private readonly prisma: any = databaseManager.getPrisma()) {}

  async findByCode(code: string): Promise<{ id: string; userId: string; status: string } | null> {
    const enabler = await this.prisma.enabler_Profile.findFirst({
      where: { OR: [{ enablerCode: code }, { enablerCodeShort: code }] },
      select: { id: true, userId: true, status: true },
    });
    return enabler ? { id: enabler.id, userId: enabler.userId, status: String(enabler.status) } : null;
  }

  async getAuthorizedProductIds(enablerId: string, productIds: string[]): Promise<string[]> {
    return (await this.getAuthorizedProductTerms(enablerId, productIds)).map((item) => item.productId);
  }

  async getAuthorizedProductTerms(enablerId: string, productIds: string[]): Promise<Array<{
    productId: string; sellerId: string; authorizationId: string; earningRuleType: string; earningRuleValue: number;
  }>> {
    if (!productIds.length) return [];
    const now = new Date();
    const enabler = await this.prisma.enabler_Profile.findUnique({ where: { id: enablerId }, select: { status: true } });
    if (!enabler || !['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) return [];
    const authorizations = await this.prisma.enabler_SellerAuthorization.findMany({
      where: {
        enablerId,
        status: 'APPROVED',
        effectiveFrom: { lte: now },
        AND: [
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
          { suspendedAt: null },
          { revokedAt: null },
        ],
      },
      include: { scopes: true },
    });
    if (!authorizations.length) return [];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: 'published',
        visibility: 'public',
        variants: { some: { status: 'active' } },
        OR: authorizations.map((authorization: any) => {
          if (authorization.scopeType === 'ALL_PRODUCTS') return { sellerId: authorization.sellerId };
          const scopes = authorization.scopes ?? [];
          const productScopeIds = scopes.filter((scope: any) => scope.scopeType === 'PRODUCT' && scope.productId).map((scope: any) => scope.productId);
          const categoryScopeIds = scopes.filter((scope: any) => scope.scopeType === 'CATEGORY' && scope.categoryId).map((scope: any) => scope.categoryId);
          return {
            sellerId: authorization.sellerId,
            OR: [
              ...(productScopeIds.length ? [{ id: { in: productScopeIds } }] : []),
              ...(categoryScopeIds.length ? [{ categoryId: { in: categoryScopeIds } }] : []),
            ],
          };
        }),
      },
      select: { id: true, sellerId: true },
    });
    const authorizationBySeller = new Map<string, any>(authorizations.map((authorization: any) => [authorization.sellerId, authorization]));
    return products.flatMap((product: { id: string; sellerId: string }) => {
      const authorization = authorizationBySeller.get(product.sellerId);
      if (!authorization) return [];
      return [{
        productId: product.id,
        sellerId: product.sellerId,
        authorizationId: authorization.id,
        earningRuleType: String(authorization.earningRuleType),
        earningRuleValue: Number(authorization.earningRuleValue),
      }];
    });
  }

}
