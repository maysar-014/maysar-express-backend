import { generateEnablerCode } from '@shared/ids/public-codes';
import prisma from '../../infrastructure/database/prisma-client';

export interface PromotedProduct {
  id: string;
  sellerId: string;
  authorizationId: string;
  title: string;
  description: string | null;
  categoryId: string;
  brand: string | null;
  price: number;
  currency: string;
  mediaUrls: string[];
}

export type PublicPromotedProduct = Omit<PromotedProduct, 'sellerId' | 'authorizationId'> & { purchaseUrl: string };

type PromotedCatalogPrisma = {
  enabler_Profile: {
    findUnique(args: any): Promise<any>;
  };
  enabler_SellerAuthorization: {
    findMany(args: any): Promise<any[]>;
  };
  enabler_PermanentLink: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  product: {
    findMany(args: any): Promise<any[]>;
    findFirst(args: any): Promise<any>;
  };
};

const isUniqueConflict = (error: unknown): boolean => (error as { code?: string })?.code === 'P2002';

export class PromotedCatalogService {
  private readonly storefrontBaseUrl: string;

  constructor(
    private readonly db: PromotedCatalogPrisma = prisma as unknown as PromotedCatalogPrisma,
    storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'https://maysar.co.tz'
  ) {
    this.storefrontBaseUrl = storefrontBaseUrl.replace(/\/+$/, '');
  }

  async getEnabler(enablerId: string): Promise<any> {
    const enabler = await this.db.enabler_Profile.findUnique({ where: { id: enablerId } });
    if (!enabler || !['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) {
      throw new Error('Active enabler not found');
    }
    return enabler;
  }

  async getAuthorizedProducts(enablerId: string, productId?: string): Promise<PromotedProduct[]> {
    await this.getEnabler(enablerId);
    const now = new Date();
    const authorizations = await this.db.enabler_SellerAuthorization.findMany({
      where: {
        enablerId,
        status: 'APPROVED',
        effectiveFrom: { lte: now },
        AND: [
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
          { suspendedAt: null },
          { revokedAt: null }
        ]
      },
      include: { scopes: true }
    });

    const productFilters = authorizations.flatMap((authorization) => {
      if (authorization.scopeType === 'ALL_PRODUCTS') return [{ sellerId: authorization.sellerId }];
      const scopes = authorization.scopes ?? [];
      const productIds = scopes.filter((scope: any) => scope.scopeType === 'PRODUCT' && scope.productId).map((scope: any) => scope.productId);
      const categoryIds = scopes.filter((scope: any) => scope.scopeType === 'CATEGORY' && scope.categoryId).map((scope: any) => scope.categoryId);
      return [
        ...(productIds.length ? [{ sellerId: authorization.sellerId, id: { in: productIds } }] : []),
        ...(categoryIds.length ? [{ sellerId: authorization.sellerId, categoryId: { in: categoryIds } }] : [])
      ];
    });

    if (!productFilters.length) return [];

    const products = await this.db.product.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        variants: { some: { status: 'active' } },
        ...(productId ? { id: productId } : {}),
        OR: productFilters
      },
      select: {
        id: true, sellerId: true, title: true, description: true, categoryId: true, brand: true,
        variants: {
          where: { status: 'active' },
          select: { price: true, images: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }]
    });

    const authorizationBySeller = new Map<string, string>(authorizations.map((authorization) => [authorization.sellerId, authorization.id]));
    return products.map((product) => {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const images: string[] = variants.flatMap((variant: any) => {
        if (!Array.isArray(variant.images)) return [];
        return variant.images.map((image: any) => typeof image === 'string' ? image : image?.url).filter(Boolean);
      });
      return {
        id: product.id,
        sellerId: product.sellerId,
        authorizationId: authorizationBySeller.get(product.sellerId)!,
        title: product.title,
        description: product.description ?? null,
        categoryId: product.categoryId,
        brand: product.brand ?? null,
        price: variants.length ? Number(variants[0].price) : 0,
        currency: 'TZS',
        mediaUrls: Array.from(new Set<string>(images)),
      };
    });
  }

  async getOrCreateCatalogLink(enablerId: string): Promise<{ publicCode: string; shareUrl: string }> {
    const enabler = await this.getEnabler(enablerId);
    const existing = await this.db.enabler_PermanentLink.findUnique({ where: { enablerId } });
    if (existing?.status === 'ACTIVE' && !existing.suspendedAt && !existing.revokedAt) return this.catalogLink(existing.publicCode);
    if (existing) throw new Error('Enabler catalog link is inactive and cannot be reactivated by the enabler');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const publicCode = generateEnablerCode();
      try {
        const link = await this.db.enabler_PermanentLink.create({
              data: { enablerId, publicCode, status: 'ACTIVE' }
            });
        return this.catalogLink(link.publicCode);
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
      }
    }

    throw new Error(`Unable to create a unique catalog link for enabler ${enabler.id}`);
  }

  async getProductShareLink(enablerId: string, productId: string): Promise<{ productId: string; shareUrl: string; authorizationId: string }> {
    const [enabler, products] = await Promise.all([
      this.getEnabler(enablerId),
      this.getAuthorizedProducts(enablerId, productId)
    ]);
    const product = products.find((item) => item.id === productId);
    if (!product) throw new Error('Product is not currently approved for this enabler');
    if (!enabler.enablerCode) throw new Error('Enabler referral code is unavailable');

    return { productId: product.id, shareUrl: this.productPurchaseUrl(product.id, enabler.enablerCode), authorizationId: product.authorizationId };
  }

  async getPublicCatalog(publicCode: string): Promise<{ enablerId: string; enablerCode: string; products: PublicPromotedProduct[] }> {
    const link = await this.db.enabler_PermanentLink.findUnique({
      where: { publicCode },
      include: { enabler: true }
    });
    if (!link || link.status !== 'ACTIVE' || link.suspendedAt || link.revokedAt
      || !link.enabler?.enablerCode
      || !['ACTIVE', 'APPROVED'].includes(String(link.enabler.status).toUpperCase())) {
      throw new Error('Enabler catalog not found');
    }

    const products = (await this.getAuthorizedProducts(link.enablerId)).map(({ sellerId: _sellerId, authorizationId: _authorizationId, ...product }) => ({
      ...product,
      purchaseUrl: this.productPurchaseUrl(product.id, link.enabler.enablerCode),
    }));
    await this.db.enabler_PermanentLink.update({
      where: { id: link.id },
      data: { lastResolvedAt: new Date(), resolveCount: { increment: 1 } }
    });

    return { enablerId: link.enablerId, enablerCode: link.enabler.enablerCode, products };
  }

  private catalogLink(publicCode: string): { publicCode: string; shareUrl: string } {
    const url = new URL(`/enabler/catalog/${encodeURIComponent(publicCode)}`, `${this.storefrontBaseUrl}/`);
    return { publicCode, shareUrl: url.toString() };
  }

  private productPurchaseUrl(productId: string, enablerCode: string): string {
    const url = new URL(`/products/${encodeURIComponent(productId)}`, `${this.storefrontBaseUrl}/`);
    url.searchParams.set('enablerCode', enablerCode);
    return url.toString();
  }
}
