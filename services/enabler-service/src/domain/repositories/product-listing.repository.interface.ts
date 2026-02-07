import { ProductListingEntity } from '../entities/product-listing.entity';

export interface IProductListingRepository {
    findById(id: string): Promise<ProductListingEntity | null>;
    findByEnablerId(enablerId: string): Promise<ProductListingEntity[]>;
    findByProductId(productId: string): Promise<ProductListingEntity[]>;
    findActiveListings(enablerId: string): Promise<ProductListingEntity[]>;
    save(listing: ProductListingEntity): Promise<void>;
    update(listing: ProductListingEntity): Promise<void>;
    delete(id: string): Promise<void>;
}
