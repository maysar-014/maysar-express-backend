import { PrismaClient } from '@prisma/client';
import { EnablerLookup } from '../../application/use-cases/initiate-checkout.use-case';

export class PrismaEnablerLookupRepository implements EnablerLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCode(code: string, shortCode?: string): Promise<{ id: string; userId: string; status: string } | null> {
    const data = await this.prisma.enabler_Profile.findFirst({
      where: {
        OR: [
          { enablerCode: code },
          ...(shortCode ? [{ enablerCodeShort: shortCode }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!data) return null;

    return {
      id: data.id,
      userId: data.userId,
      status: String(data.status)
    };
  }

  async getAuthorizedProductIds(enablerId: string, productIds: string[]): Promise<string[]> {
    if (!productIds.length) return [];
    const enabler = await (this.prisma as any).enabler_Profile.findUnique({
      where: { id: enablerId },
      select: { status: true },
    });
    if (!enabler || !['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) return [];
    const now = new Date();
    const authorizations = await (this.prisma as any).enabler_SellerAuthorization.findMany({
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

    const products = await (this.prisma as any).product.findMany({
      where: {
        id: { in: productIds },
        status: 'published',
        visibility: 'public',
        variants: { some: { status: 'active' } },
        OR: authorizations.map((authorization: any) => {
          if (authorization.scopeType === 'ALL_PRODUCTS') return { sellerId: authorization.sellerId };
          const scopes = authorization.scopes ?? [];
          const scopedProductIds = scopes
            .filter((scope: any) => scope.scopeType === 'PRODUCT' && scope.productId)
            .map((scope: any) => scope.productId);
          const scopedCategoryIds = scopes
            .filter((scope: any) => scope.scopeType === 'CATEGORY' && scope.categoryId)
            .map((scope: any) => scope.categoryId);
          return {
            sellerId: authorization.sellerId,
            OR: [
              ...(scopedProductIds.length ? [{ id: { in: scopedProductIds } }] : []),
              ...(scopedCategoryIds.length ? [{ categoryId: { in: scopedCategoryIds } }] : []),
            ],
          };
        }),
      },
      select: { id: true },
    });
    return products.map((product: { id: string }) => product.id);
  }
}
