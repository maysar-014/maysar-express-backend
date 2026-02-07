import { ProductListingEntity } from '../../domain/entities/product-listing.entity';
import { ProductListingResponseDto } from '../dto/product-listing.dto';

export class ProductListingMapper {
    static toResponseDto(listing: ProductListingEntity): ProductListingResponseDto {
        return {
            id: listing.id,
            enablerId: listing.enablerId,
            productId: listing.productId,
            sellerId: listing.sellerId,
            status: listing.status,
            customPrice: listing.customPrice || undefined,
            priceMarkup: listing.priceMarkup || undefined,
            visibility: listing.toPlainObject().visibility,
            sellerApproved: listing.sellerApproved,
            views: listing.toPlainObject().views,
            clicks: listing.toPlainObject().clicks,
            orders: listing.toPlainObject().orders,
            createdAt: listing.toPlainObject().createdAt,
        };
    }

    static toResponseList(listings: ProductListingEntity[]): ProductListingResponseDto[] {
        return listings.map(this.toResponseDto);
    }
}
