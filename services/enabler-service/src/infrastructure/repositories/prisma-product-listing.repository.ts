import { IProductListingRepository } from '../../domain/repositories/product-listing.repository.interface';
import { ProductListingEntity } from '../../domain/entities/product-listing.entity';
import prisma from '../database/prisma-client';

export class PrismaProductListingRepository implements IProductListingRepository {

    async findById(id: string): Promise<ProductListingEntity | null> {
        const data = await prisma.enabler_ProductListing.findUnique({ where: { id } });
        if (!data) return null;
        return this.mapToEntity(data);
    }

    async findByEnablerId(enablerId: string): Promise<ProductListingEntity[]> {
        const data = await prisma.enabler_ProductListing.findMany({ where: { enablerId } });
        return data.map(this.mapToEntity);
    }

    async findByProductId(productId: string): Promise<ProductListingEntity[]> {
        const data = await prisma.enabler_ProductListing.findMany({ where: { productId } });
        return data.map(this.mapToEntity);
    }

    async findActiveListings(enablerId: string): Promise<ProductListingEntity[]> {
        const data = await prisma.enabler_ProductListing.findMany({
            where: {
                enablerId,
                status: 'ACTIVE'
            }
        });
        return data.map(this.mapToEntity);
    }

    async save(listing: ProductListingEntity): Promise<void> {
        const data = listing.toPlainObject();
        await prisma.enabler_ProductListing.create({
            data: {
                id: data.id,
                enablerId: data.enablerId,
                productId: data.productId,
                sellerId: data.sellerId,
                status: data.status,
                visibility: data.visibility,
                customPrice: data.customPrice,
                priceMarkup: data.priceMarkup,
                listingTerms: data.listingTerms || undefined,
                sellerApproved: data.sellerApproved,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            }
        });
    }

    async update(listing: ProductListingEntity): Promise<void> {
        const data = listing.toPlainObject();
        await prisma.enabler_ProductListing.update({
            where: { id: data.id },
            data: {
                status: data.status,
                visibility: data.visibility,
                customPrice: data.customPrice,
                priceMarkup: data.priceMarkup,
                listingTerms: data.listingTerms || undefined,
                views: data.views,
                clicks: data.clicks,
                orders: data.orders,
                revenue: data.revenue,
                updatedAt: new Date()
            }
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.enabler_ProductListing.delete({ where: { id } });
    }

    private mapToEntity(data: any): ProductListingEntity {
        return ProductListingEntity.create({
            ...data,
            customPrice: data.customPrice ? Number(data.customPrice) : null,
            priceMarkup: data.priceMarkup ? Number(data.priceMarkup) : null,
            revenue: Number(data.revenue)
        });
    }
}
