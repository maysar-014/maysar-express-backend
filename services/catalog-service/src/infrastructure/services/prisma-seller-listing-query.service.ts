import { PrismaClient } from '@prisma/client';
import { ISellerListingQueryService } from '../../domain/services/seller-listing-query.service';
import { SellerListingInput } from '../../domain/value-objects/seller-listing-input.value-object';

export class PrismaSellerListingQueryService implements ISellerListingQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getListingsForProduct(productId: string): Promise<SellerListingInput[]> {
    const listings = await this.prisma.enabler_ProductListing.findMany({
      where: {
        productId,
        status: 'ACTIVE',
        visibility: true
      },
      include: {
        enabler: {
          select: {
            status: true,
            createdAt: true
          }
        }
      }
    });

    return listings.map(listing => ({
      sellerId: listing.sellerId,
      price: listing.customPrice?.toNumber() || 0,
      rating: 4.0, // TODO: Fetch from seller metrics
      stock: 10, // TODO: Fetch from inventory
      matchConfidence: 1.0, // TODO: Fetch from match audit
      isSuspended: listing.enabler.status === 'SUSPENDED',
      lastUpdated: listing.updatedAt,
      isNewSeller: this.isNewSeller(listing.enabler.createdAt),
      recencyBoost: this.hasRecentActivity(listing.updatedAt)
    }));
  }

  private isNewSeller(createdAt: Date): boolean {
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 30;
  }

  private hasRecentActivity(updatedAt: Date): boolean {
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 7;
  }
}
