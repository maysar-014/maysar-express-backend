import { ListProductUseCase } from '../use-cases/list-product.use-case';

export class ProductListingSaga {
    constructor(
        private readonly listProductUseCase: ListProductUseCase,
        private readonly notificationService: any,
        private readonly catalogService: any
    ) { }

    async execute(enablerId: string, listingData: any): Promise<void> {
        try {
            // 1. Verify Product Status (Must be active/published)
            const product = await this.catalogService.getProduct(listingData.productId);
            if (product.status !== 'published') {
                throw new Error('Product is not published');
            }

            // 2. Create Listing
            const listing = await this.listProductUseCase.execute(enablerId, listingData);

            // 3. Notify Seller (if required)
            if (product.seller.settings.notifyOnEnablerListing) {
                await this.notificationService.sendNotification(
                    product.sellerId,
                    `Enabler ${enablerId} listed your product ${product.title}`
                );
            }

            // 4. Update Catalog Stats (if needed)
            // await this.catalogService.incrementEnablerCount(listingData.productId);

        } catch (error) {
            // Compensation: Remove listing if created but subsequent steps failed?
            // For read-only/notification steps, usually just log error
            console.error('Product Listing Saga Failed:', error);
            throw error;
        }
    }
}
