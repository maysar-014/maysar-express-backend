import { getModelPrefix, makeId } from '@shared/ids/id';
import prisma from '../../infrastructure/database/prisma-client';

type PromotionScope = 'ALL_PRODUCTS' | 'CATEGORY' | 'PRODUCT';
type PromotionDb = any;

export interface SavePromotionOfferInput {
  scopeType: PromotionScope;
  commissionPercent: number;
  requiredEnablerCount: number;
  productIds?: string[];
  categoryIds?: string[];
}

export class SellerPromotionProgramService {
  constructor(private readonly db: PromotionDb = prisma as unknown as PromotionDb) {}

  async saveOffer(sellerId: string, input: SavePromotionOfferInput) {
    this.validateOffer(input);
    await this.validateSellerScope(sellerId, input);
    const now = new Date();
    const offer = await this.db.enabler_PromotionOffer.upsert({
      where: { sellerId },
      create: {
        id: makeId(getModelPrefix('Enabler_PromotionOffer')),
        sellerId,
        status: 'OPEN',
        scopeType: input.scopeType,
        earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL',
        earningRuleValue: input.commissionPercent,
        requiredEnablerCount: input.requiredEnablerCount,
        productIds: input.scopeType === 'PRODUCT' ? input.productIds ?? [] : [],
        categoryIds: input.scopeType === 'CATEGORY' ? input.categoryIds ?? [] : [],
        updatedAt: now,
      },
      update: {
        status: 'OPEN',
        scopeType: input.scopeType,
        earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL',
        earningRuleValue: input.commissionPercent,
        requiredEnablerCount: input.requiredEnablerCount,
        productIds: input.scopeType === 'PRODUCT' ? input.productIds ?? [] : [],
        categoryIds: input.scopeType === 'CATEGORY' ? input.categoryIds ?? [] : [],
        closedAt: null,
        updatedAt: now,
      },
    });
    // Approved authorizations are immutable terms snapshots. Existing enablers
    // keep their approved rate when the seller updates the offer for new applicants.
    return this.withCounts(offer);
  }

  async closeOffer(sellerId: string) {
    const offer = await this.db.enabler_PromotionOffer.findUnique({ where: { sellerId } });
    if (!offer) throw new Error('Promotion offer not found');
    const closedAt = new Date();
    await this.db.$transaction(async (tx: PromotionDb) => {
      await tx.enabler_PromotionOffer.update({
        where: { id: offer.id },
        data: { status: 'CLOSED', closedAt },
      });
      await tx.enabler_SellerAuthorization.updateMany({
        where: { promotionOfferId: offer.id, status: 'PENDING' },
        data: { status: 'REVOKED', revokedAt: closedAt, revokedReason: 'Seller closed the promotion offer' },
      });
    });
    return this.withCounts({ ...offer, status: 'CLOSED' });
  }

  async getSellerProgram(sellerId: string) {
    const offer = await this.db.enabler_PromotionOffer.findUnique({
      where: { sellerId },
      include: {
        authorizations: {
          where: { promotionOfferId: { not: null } },
          include: { enabler: { select: { id: true, userId: true, businessName: true, enablerCode: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!offer) return null;
    return this.withCounts(offer, true);
  }

  async browseOffers(enablerId: string) {
    const enabler = await this.db.enabler_Profile.findUnique({ where: { id: enablerId }, select: { status: true } });
    if (!enabler || !['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) {
      throw new Error('Active enabler not found');
    }
    const offers = await this.db.enabler_PromotionOffer.findMany({
      where: { status: 'OPEN' },
      orderBy: { updatedAt: 'desc' },
    });
    const authorizations = await this.db.enabler_SellerAuthorization.findMany({
      where: { enablerId, promotionOfferId: { in: offers.map((offer: any) => offer.id) } },
      select: { id: true, promotionOfferId: true, status: true },
    });
    const byOffer = new Map<string, { id: string; status: string }>(
      authorizations.filter((authorization: any) => authorization.promotionOfferId)
        .map((authorization: any) => [authorization.promotionOfferId as string, authorization])
    );
    const visible = await Promise.all(offers.map(async (offer: any) => {
      const counts = await this.counts(offer.id);
      const authorization = byOffer.get(offer.id);
      const products = await this.offerProducts(offer);
      return {
        ...this.publicOffer(offer, counts),
        products,
        application: authorization ? { id: authorization.id, status: authorization.status } : null,
        canApply: counts.approved < offer.requiredEnablerCount && !['PENDING', 'APPROVED'].includes(authorization?.status ?? ''),
      };
    }));
    return visible.filter((offer: any) => offer.products.length > 0);
  }

  async apply(enablerId: string, offerId: string) {
    const [enabler, offer] = await Promise.all([
      this.db.enabler_Profile.findUnique({ where: { id: enablerId }, select: { id: true, status: true } }),
      this.db.enabler_PromotionOffer.findUnique({ where: { id: offerId } }),
    ]);
    if (!enabler || !['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) throw new Error('Active enabler not found');
    if (!offer || offer.status !== 'OPEN') throw new Error('Promotion offer is not open');
    const products = await this.offerProducts(offer);
    if (!products.length) throw new Error('Promotion offer has no currently eligible products');

    const applyInTransaction = async (tx: PromotionDb) => {
      const taken = await tx.enabler_SellerAuthorization.count({
        where: { promotionOfferId: offer.id, status: { in: ['APPROVED', 'SUSPENDED'] }, revokedAt: null },
      });
      if (taken >= offer.requiredEnablerCount) throw new Error('Promotion offer has no enabler spots remaining');
      const existing = await tx.enabler_SellerAuthorization.findUnique({
        where: { enablerId_sellerId: { enablerId, sellerId: offer.sellerId } },
        select: { id: true, status: true },
      });
      if (existing?.status === 'APPROVED' || existing?.status === 'PENDING') throw new Error('An application already exists for this seller');
      const authorizationId = existing?.id ?? makeId(getModelPrefix('Enabler_SellerAuthorization'));
      await tx.enabler_SellerAuthorization.upsert({
        where: { enablerId_sellerId: { enablerId, sellerId: offer.sellerId } },
        create: {
          id: authorizationId,
          enablerId,
          sellerId: offer.sellerId,
          promotionOfferId: offer.id,
          status: 'PENDING',
          scopeType: offer.scopeType,
          earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL',
          earningRuleValue: offer.earningRuleValue,
          currency: offer.currency,
          updatedAt: new Date(),
          scopes: { create: this.scopeRows(authorizationId, offer) },
        },
        update: {
          promotionOfferId: offer.id,
          status: 'PENDING',
          scopeType: offer.scopeType,
          earningRuleType: 'PERCENTAGE_OF_ITEM_SUBTOTAL',
          earningRuleValue: offer.earningRuleValue,
          currency: offer.currency,
          effectiveFrom: new Date(),
          effectiveUntil: null,
          approvedByUserId: null,
          approvedAt: null,
          revokedByUserId: null,
          revokedAt: null,
          revokedReason: null,
          suspendedAt: null,
          updatedAt: new Date(),
          scopes: { deleteMany: {}, create: this.scopeRows(authorizationId, offer) },
        },
      });
      return authorizationId;
    };

    if (this.db.$transaction) {
      return this.db.$transaction(async (tx: PromotionDb) => {
        const authorizationId = await applyInTransaction(tx);
        return { authorizationId, status: 'PENDING', sellerId: offer.sellerId, offerId: offer.id };
      }, { isolationLevel: 'Serializable' });
    }
    const authorizationId = await applyInTransaction(this.db);
    return { authorizationId, status: 'PENDING', sellerId: offer.sellerId, offerId: offer.id };
  }

  async decideApplication(sellerId: string, authorizationId: string, decision: 'APPROVE' | 'REJECT' | 'REVOKE', actorUserId: string) {
    return this.db.$transaction(async (tx: PromotionDb) => {
      const authorization = await tx.enabler_SellerAuthorization.findFirst({
        where: { id: authorizationId, sellerId },
        include: { promotionOffer: true, enabler: { select: { status: true } } },
      });
      if (!authorization || !authorization.promotionOfferId) throw new Error('Promotion application not found');
      if (decision === 'REVOKE') {
        if (authorization.status !== 'APPROVED') throw new Error('Only an approved enabler can be revoked');
        return tx.enabler_SellerAuthorization.update({
          where: { id: authorization.id },
          data: { status: 'REVOKED', revokedByUserId: actorUserId, revokedAt: new Date(), revokedReason: 'Seller revoked promotion approval' },
        });
      }
      if (authorization.status !== 'PENDING') throw new Error('Pending promotion application not found');
      if (decision === 'APPROVE') {
        if (!['ACTIVE', 'APPROVED'].includes(String(authorization.enabler?.status).toUpperCase())) {
          throw new Error('Enabler is not active');
        }
        const offer = authorization.promotionOffer;
        if (!offer || offer.status !== 'OPEN') throw new Error('Promotion offer is closed');
        const taken = await tx.enabler_SellerAuthorization.count({
          where: { promotionOfferId: offer.id, status: { in: ['APPROVED', 'SUSPENDED'] }, revokedAt: null },
        });
        if (taken >= offer.requiredEnablerCount) throw new Error('Promotion offer has no enabler spots remaining');
        return tx.enabler_SellerAuthorization.update({
          where: { id: authorization.id },
          data: { status: 'APPROVED', approvedByUserId: actorUserId, approvedAt: new Date(), effectiveFrom: new Date() },
        });
      }
      return tx.enabler_SellerAuthorization.update({
        where: { id: authorization.id },
        data: { status: 'REVOKED', revokedByUserId: actorUserId, revokedAt: new Date(), revokedReason: 'Seller declined promotion application' },
      });
    }, { isolationLevel: 'Serializable' });
  }

  private validateOffer(input: SavePromotionOfferInput): void {
    if (!['ALL_PRODUCTS', 'CATEGORY', 'PRODUCT'].includes(input.scopeType)) throw new Error('Invalid promotion scope');
    if (!Number.isFinite(input.commissionPercent) || input.commissionPercent <= 0 || input.commissionPercent > 50) throw new Error('Commission percent must be greater than 0 and at most 50');
    if (!Number.isInteger(input.requiredEnablerCount) || input.requiredEnablerCount < 1 || input.requiredEnablerCount > 1000) throw new Error('Required enabler count must be an integer between 1 and 1000');
    if (input.scopeType === 'PRODUCT' && !(input.productIds?.length)) throw new Error('At least one product is required for PRODUCT scope');
    if (input.scopeType === 'CATEGORY' && !(input.categoryIds?.length)) throw new Error('At least one category is required for CATEGORY scope');
    if (input.scopeType !== 'PRODUCT' && input.productIds?.length) throw new Error('Product IDs are only allowed for PRODUCT scope');
    if (input.scopeType !== 'CATEGORY' && input.categoryIds?.length) throw new Error('Category IDs are only allowed for CATEGORY scope');
  }

  private async validateSellerScope(sellerId: string, input: SavePromotionOfferInput): Promise<void> {
    if (input.scopeType === 'PRODUCT') {
      const products = await this.db.product.findMany({ where: { sellerId, id: { in: input.productIds }, status: 'published', visibility: 'public' }, select: { id: true } });
      if (products.length !== new Set(input.productIds).size) throw new Error('Every selected product must be public and owned by this seller');
    }
    if (input.scopeType === 'CATEGORY') {
      const categories = await this.db.product.findMany({ where: { sellerId, categoryId: { in: input.categoryIds }, status: 'published', visibility: 'public' }, distinct: ['categoryId'], select: { categoryId: true } });
      if (categories.length !== new Set(input.categoryIds).size) throw new Error('Every selected category must contain public products owned by this seller');
    }
  }

  private scopeRows(_authorizationId: string, offer: any) {
    if (offer.scopeType === 'PRODUCT') return (offer.productIds ?? []).map((productId: string) => ({
      id: makeId(getModelPrefix('Enabler_SellerAuthorizationScope')), scopeType: 'PRODUCT', productId,
    }));
    if (offer.scopeType === 'CATEGORY') return (offer.categoryIds ?? []).map((categoryId: string) => ({
      id: makeId(getModelPrefix('Enabler_SellerAuthorizationScope')), scopeType: 'CATEGORY', categoryId,
    }));
    return [];
  }

  private async offerProducts(offer: any) {
    const products = await this.db.product.findMany({
      where: {
        sellerId: offer.sellerId,
        status: 'published',
        visibility: 'public',
        variants: { some: { status: 'active' } },
        ...(offer.scopeType === 'PRODUCT' ? { id: { in: offer.productIds } } : {}),
        ...(offer.scopeType === 'CATEGORY' ? { categoryId: { in: offer.categoryIds } } : {}),
      },
      select: { id: true, title: true, description: true, categoryId: true, brand: true, variants: { where: { status: 'active' }, select: { price: true, images: true }, orderBy: { price: 'asc' } } },
      orderBy: { title: 'asc' },
    });
    return products.map((product: any) => {
      const variants = product.variants ?? [];
      const mediaUrls = variants.flatMap((variant: any) => Array.isArray(variant.images)
        ? variant.images.map((image: any) => typeof image === 'string' ? image : image?.url).filter(Boolean)
        : []);
      return {
        id: product.id,
        title: product.title,
        description: product.description ?? null,
        categoryId: product.categoryId,
        brand: product.brand ?? null,
        price: variants.length ? Number(variants[0].price) : null,
        currency: 'TZS',
        mediaUrls: Array.from(new Set<string>(mediaUrls)),
      };
    });
  }

  private async counts(offerId: string) {
    const [approved, pending] = await Promise.all([
      this.db.enabler_SellerAuthorization.count({ where: { promotionOfferId: offerId, status: { in: ['APPROVED', 'SUSPENDED'] }, revokedAt: null } }),
      this.db.enabler_SellerAuthorization.count({ where: { promotionOfferId: offerId, status: 'PENDING' } }),
    ]);
    return { approved, pending };
  }

  private async withCounts(offer: any, includeApplications = false) {
    const counts = await this.counts(offer.id);
    const result: any = { ...this.publicOffer(offer, counts) };
    if (includeApplications) result.applications = (offer.authorizations ?? []).map((authorization: any) => ({
      id: authorization.id,
      enabler: authorization.enabler,
      status: authorization.status,
      appliedAt: authorization.createdAt,
    }));
    return result;
  }

  private publicOffer(offer: any, counts: { approved: number; pending: number }) {
    return {
      id: offer.id,
      sellerId: offer.sellerId,
      status: offer.status,
      scopeType: offer.scopeType,
      commissionPercent: Number(offer.earningRuleValue),
      requiredEnablerCount: offer.requiredEnablerCount,
      approvedEnablerCount: counts.approved,
      pendingApplicationCount: counts.pending,
      remainingEnablerSpots: Math.max(0, offer.requiredEnablerCount - counts.approved),
      productIds: offer.productIds ?? [],
      categoryIds: offer.categoryIds ?? [],
      updatedAt: offer.updatedAt,
    };
  }
}
