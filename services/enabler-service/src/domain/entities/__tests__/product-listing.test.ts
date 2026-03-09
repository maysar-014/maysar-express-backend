import { ProductListingEntity, ProductListingProps } from '../../entities/product-listing.entity';
import { Enabler_ListingStatus } from '../../types/enabler.types';

describe('ProductListingEntity', () => {
    const validProps: ProductListingProps = {
        id: 'listing-123',
        enablerId: 'enabler-123',
        productId: 'product-123',
        sellerId: 'seller-123',
        status: Enabler_ListingStatus.ACTIVE,
        visibility: true,
        sellerApproved: true,
        views: 0,
        clicks: 0,
        orders: 0,
        revenue: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    describe('creation and getters', () => {
        it('should create valid entity', () => {
            const listing = ProductListingEntity.create(validProps);
            expect(listing.id).toBe('listing-123');
            expect(listing.isActive).toBe(true);
        });

        it('should check expired status', () => {
            const expiredListing = ProductListingEntity.create({
                ...validProps,
                expiresAt: new Date(Date.now() - 1000)
            });
            expect(expiredListing.isActive).toBe(false);
            expect(expiredListing.isExpired()).toBe(true);
        });
    });

    describe('business logic', () => {
        it('should validate against seller policies', () => {
            const listing = ProductListingEntity.create(validProps);

            const strictRules = {
                allowsEnablers: true,
                requiresApproval: true,
                blockedEnablers: []
            };
            expect(listing.validateAgainstSellerRules(strictRules)).toBe(true);

            const blockedRules = {
                allowsEnablers: true,
                requiresApproval: true,
                blockedEnablers: ['enabler-123']
            };
            expect(listing.validateAgainstSellerRules(blockedRules)).toBe(false);
        });

        it('should validate pricing', () => {
            const listing = ProductListingEntity.create({
                ...validProps,
                priceMarkup: 0.2
            });

            expect(listing.hasValidPricing(100, 0, 0.5)).toBe(true);
            expect(listing.hasValidPricing(100, 0, 0.1)).toBe(false);
        });

        it('should track metrics', () => {
            const listing = ProductListingEntity.create(validProps);

            listing.trackView();
            listing.trackClick();
            listing.trackOrder(100);

            const plain = listing.toPlainObject();
            expect(plain.views).toBe(1);
            expect(plain.clicks).toBe(1);
            expect(plain.orders).toBe(1);
            expect(plain.revenue).toBe(100);
            expect(listing.getConversionRate()).toBe(1);
        });
    });

    describe('state transitions', () => {
        it('should pause and activate', () => {
            const listing = ProductListingEntity.create(validProps);
            listing.pause();
            expect(listing.status).toBe(Enabler_ListingStatus.PAUSED);

            listing.activate();
            expect(listing.status).toBe(Enabler_ListingStatus.ACTIVE);
            expect(listing.isActive).toBe(true);
        });

        it('should remove listing', () => {
            const listing = ProductListingEntity.create(validProps);
            listing.remove();
            expect(listing.status).toBe(Enabler_ListingStatus.REMOVED);
            expect(listing.isActive).toBe(false);
        });

        it('should throw when activating removed listing', () => {
            const listing = ProductListingEntity.create({ ...validProps, status: Enabler_ListingStatus.REMOVED });
            expect(() => listing.activate()).toThrow();
        });

        it('should update terms and pricing', () => {
            const listing = ProductListingEntity.create(validProps);
            listing.updateTerms({ commission: 0.1 });
            listing.updatePricing(150, undefined);

            expect(listing.toPlainObject().listingTerms).toEqual({ commission: 0.1 });
            expect(listing.customPrice).toBe(150);
        });

        it('should approve by seller', () => {
            const listing = ProductListingEntity.create({ ...validProps, sellerApproved: false });
            listing.approveBySeller('seller-123');
            expect(listing.sellerApproved).toBe(true);
        });

        it('should throw if wrong seller approves', () => {
            const listing = ProductListingEntity.create({ ...validProps, sellerApproved: false });
            expect(() => listing.approveBySeller('wrong-seller')).toThrow();
        });
    });
});
