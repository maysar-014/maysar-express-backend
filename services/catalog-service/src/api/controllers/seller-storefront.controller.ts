import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma as defaultPrisma } from '../../../../../src/config/prisma';
import { generateDefaultSlug } from '../../utils/slug.utils';

interface SellerStorefrontPrisma {
  business: {
    findFirst(args: unknown): Promise<{
      id: string;
      ownerId: string;
      name: string;
      description: string | null;
      attributes?: unknown;
    } | null>;
  };
  product: {
    count(args: unknown): Promise<number>;
  };
  sellerStorefront: {
    findUnique(args: unknown): Promise<{ sellerId: string; slug: string } | null>;
    upsert(args: unknown): Promise<{ sellerId: string; slug: string }>;
  };
}

export interface SellerStorefrontResponse {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  shareUrl: string;
  shortUrl: string;
  qrCode?: string;
  stats: {
    totalProducts: number;
    rating: number;
  };
}

export interface ShareUrlResponse {
  shareUrl: string;
  shortUrl: string;
  qrCode?: string;
}

interface PublicSeller {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  totalProducts: number;
  rating: number;
  slug: string;
}

export class SellerStorefrontController {
  private readonly baseUrl: string;

  constructor(
    private readonly db: SellerStorefrontPrisma = defaultPrisma as unknown as SellerStorefrontPrisma,
    baseUrl: string = process.env.STOREFRONT_BASE_URL || 'https://maysar.co.tz'
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async getStorefront(req: Request, res: Response): Promise<void> {
    try {
      const identifier = req.params.sellerId?.trim();
      if (!identifier) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Seller ID or storefront slug is required' }
        });
        return;
      }

      const seller = await this.getSellerDetails(identifier);
      if (!seller) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Seller storefront not found' }
        });
        return;
      }

      const urls = this.buildUrls(seller.slug);
      const response: SellerStorefrontResponse = {
        id: seller.id,
        name: seller.name,
        description: seller.description,
        logo: seller.logo,
        ...urls,
        qrCode: await this.generateQRCode(urls.shareUrl),
        stats: {
          totalProducts: seller.totalProducts,
          // No seller-rating source is currently modeled in the catalog schema.
          rating: seller.rating
        }
      };

      res.status(200).json({ success: true, data: response, meta: { timestamp: new Date() } });
    } catch (error) {
      console.error('SellerStorefrontController.getStorefront error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront' }
      });
    }
  }

  async generateShareUrl(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = req.params.sellerId?.trim();
      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Seller ID is required' }
        });
        return;
      }

      const user = (req as Request & { user?: { userId?: string; id?: string; roles?: string[]; role?: string } }).user;
      const authenticatedUserId = user?.userId || user?.id;
      const roles = [...(user?.roles ?? []), ...(user?.role ? [user.role] : [])].map((role) => role.toLowerCase());
      if (authenticatedUserId !== sellerId && !roles.includes('admin')) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only the seller or an admin can generate this storefront link' }
        });
        return;
      }

      const seller = await this.getSellerDetails(sellerId);
      if (!seller) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Seller storefront not found' }
        });
        return;
      }

      const { includeQR = true, customSlug } = req.body ?? {};
      const slug = customSlug || seller.slug;
      let savedSlug = seller.slug;
      if (customSlug && customSlug !== seller.slug) {
        try {
          if (customSlug !== sellerId) {
            const sellerIdCollision = await this.db.business.findFirst({
              where: { ownerId: customSlug },
              select: { id: true }
            });
            if (sellerIdCollision) {
              res.status(409).json({
                success: false,
                error: { code: 'SLUG_UNAVAILABLE', message: 'That storefront slug is already in use' }
              });
              return;
            }
          }

          const saved = await this.db.sellerStorefront.upsert({
            where: { sellerId },
            create: { sellerId, slug: customSlug },
            update: { slug: customSlug }
          });
          savedSlug = saved.slug;
        } catch (error) {
          if ((error as { code?: string })?.code === 'P2002') {
            res.status(409).json({
              success: false,
              error: { code: 'SLUG_UNAVAILABLE', message: 'That storefront slug is already in use' }
            });
            return;
          }
          throw error;
        }
      }

      const urls = this.buildUrls(savedSlug || slug);
      const response: ShareUrlResponse = { ...urls };
      if (includeQR) response.qrCode = await this.generateQRCode(urls.shareUrl);

      res.status(200).json({ success: true, data: response, meta: { timestamp: new Date() } });
    } catch (error) {
      console.error('SellerStorefrontController.generateShareUrl error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate share URL' }
      });
    }
  }

  private buildUrls(slug: string): Pick<SellerStorefrontResponse, 'shareUrl' | 'shortUrl'> {
    const encodedSlug = encodeURIComponent(slug);
    return {
      shareUrl: `${this.baseUrl}/seller/${encodedSlug}`,
      shortUrl: `${this.baseUrl}/s/${encodedSlug}`
    };
  }

  private async generateQRCode(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1
    });
  }

  private async getSellerDetails(identifier: string): Promise<PublicSeller | null> {
    const savedSlug = await this.db.sellerStorefront.findUnique({ where: { slug: identifier } });
    const sellerId = savedSlug?.sellerId ?? identifier;
    const business = await this.db.business.findFirst({
      where: {
        ownerId: sellerId,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        complianceStatus: { not: 'NON_COMPLIANT' }
      },
      orderBy: { createdAt: 'asc' }
    });
    if (!business) return null;

    let existingSlug = savedSlug?.sellerId === sellerId
      ? savedSlug.slug
      : (await this.db.sellerStorefront.findUnique({ where: { sellerId } }))?.slug;
    const attributes = business.attributes && typeof business.attributes === 'object'
      ? business.attributes as Record<string, unknown>
      : {};
    const logo = attributes.logoUrl ?? attributes.logo;

    const totalProducts = await this.db.product.count({
      where: {
        sellerId,
        status: 'published',
        visibility: 'public'
      }
    });

    // When no slug is persisted, auto-generate one from the business name,
    // persist it, and use the persisted value — never fall back to the raw sellerId.
    if (!existingSlug) {
      const generatedSlug = await generateDefaultSlug(
        business.name,
        sellerId,
        (candidate) =>
          this.db.sellerStorefront
            .findUnique({ where: { slug: candidate } })
            .then((row) => row !== null)
      );
      const upserted = await this.db.sellerStorefront.upsert({
        where: { sellerId },
        create: { sellerId, slug: generatedSlug },
        update: { slug: generatedSlug }
      });
      existingSlug = upserted.slug;
    }

    return {
      id: sellerId,
      name: business.name,
      description: business.description ?? undefined,
      logo: typeof logo === 'string' ? logo : undefined,
      totalProducts,
      rating: 0,
      slug: existingSlug
    };
  }
}
