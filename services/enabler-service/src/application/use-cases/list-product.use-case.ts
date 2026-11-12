import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { IProductListingRepository } from '../../domain/repositories/product-listing.repository.interface';
import { CreateProductListingDto, ProductListingResponseDto } from '../dto/product-listing.dto';
import { ProductListingEntity } from '../../domain/entities/product-listing.entity';
import { ProductListingPolicy } from '../../domain/policies/product-listing.policy';
import { ProductListedEvent } from '../../domain/events/enabler-events';
import { ProductListingMapper } from '../mappers/product-listing.mapper';
import { Enabler_ListingStatus, Enabler_Status } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { PromotedCatalogService } from '../services/promoted-catalog.service';

export interface PromotionAuthorizationLookup {
    getAuthorizedProducts(enablerId: string, productId?: string): Promise<Array<{ id: string; sellerId: string; authorizationId: string }>>;
}

export class ListProductUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly listingRepository: IProductListingRepository,
        private readonly catalogService: any, // Interface to be defined
        private readonly eventPublisher: any,
        private readonly authorizationLookup: PromotionAuthorizationLookup = new PromotedCatalogService()
    ) { }

    async execute(enablerId: string, dto: CreateProductListingDto): Promise<ProductListingResponseDto> {
        // 1. Validate Enabler
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) throw new Error('Enabler not found');

        if (!enabler.canListProducts()) {
            throw new Error('Enabler is not eligible to list products');
        }

        // 2. Fetch Product & Seller Info (External Service)
        const product = await this.catalogService.getProduct(dto.productId);
        if (!product) throw new Error('Product not found');

        // Legacy listing records must not bypass the seller's current approval.
        // The authorization service is the live source of truth and re-checks
        // scope, effective dates, revocation, suspension, and product visibility.
        const [authorizedProduct] = await this.authorizationLookup.getAuthorizedProducts(enablerId, dto.productId);
        if (!authorizedProduct || authorizedProduct.sellerId !== product.sellerId) {
            throw new Error('Cannot list product: active seller authorization is required');
        }

        // 3. Apply Listing Policy
        const currentListings = await this.listingRepository.findByEnablerId(enablerId);

        const policyCheck = ProductListingPolicy.canListProduct({
            enablerTier: enabler.tier,
            enablerStatus: enabler.status as Enabler_Status,
            productStatus: product.status,
            sellerAllowsEnablers: true,
            sellerBlockedEnablers: [],
            currentListingsCount: currentListings.length
        }, enablerId);

        if (!policyCheck.allowed) {
            throw new Error(`Cannot list product: ${policyCheck.reason}`);
        }

        // 4. Validate Pricing
        if (dto.customPrice || dto.priceMarkup) {
            const validPricing = ProductListingPolicy.validatePricing(product.price, dto.customPrice || product.price, 0.5);
            if (!validPricing) throw new Error('Invalid pricing configuration');
        }

        // 5. Create Listing Entity
        const listing = ProductListingEntity.create({
            id: makeId(getModelPrefix('Enabler_ProductListing')),
            enablerId,
            productId: dto.productId,
            sellerId: product.sellerId,
            status: Enabler_ListingStatus.ACTIVE,
            visibility: dto.visibility ?? true,
            customPrice: dto.customPrice,
            priceMarkup: dto.priceMarkup,
            listingTerms: {
                minOrderQuantity: dto.minOrderQuantity,
                deliveryTimeframe: dto.deliveryTimeframe,
                returnPolicy: dto.returnPolicy,
                warrantyPeriod: dto.warrantyPeriod
            },
            sellerApproved: true,
            views: 0,
            clicks: 0,
            orders: 0,
            revenue: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 6. Save Listing
        await this.listingRepository.save(listing);

        // 7. Publish Event
        await this.eventPublisher.publish(new ProductListedEvent(listing.id, enablerId, dto.productId));

        return ProductListingMapper.toResponseDto(listing);
    }
}
