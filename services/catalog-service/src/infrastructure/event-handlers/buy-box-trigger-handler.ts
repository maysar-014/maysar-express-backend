import { eventBus } from '@shared-events/eventBus';
import { ComputeBuyBoxUseCase } from '../../application/use-cases/compute-buy-box.use-case';
import { ISellerListingQueryService } from '../../domain/services/seller-listing-query.service';

export class BuyBoxTriggerHandler {
  constructor(
    private readonly computeUseCase: ComputeBuyBoxUseCase,
    private readonly listingQueryService: ISellerListingQueryService
  ) {}

  register(eventBus: typeof import('../../../../../shared/events/eventBus').eventBus): void {
    eventBus.subscribe('ProductMatchConfirmed', async (event: any) => {
      try {
        const listings = await this.listingQueryService.getListingsForProduct(event.confirmedProductId);
        await this.computeUseCase.execute({
          productId: event.confirmedProductId,
          listings
        });
      } catch (error: any) {
        console.error('Error computing Buy Box for ProductMatchConfirmed:', error);
      }
    });

    eventBus.subscribe('SellerListingUpdated', async (event: any) => {
      try {
        const listings = await this.listingQueryService.getListingsForProduct(event.productId);
        await this.computeUseCase.execute({
          productId: event.productId,
          listings
        });
      } catch (error: any) {
        console.error('Error computing Buy Box for SellerListingUpdated:', error);
      }
    });

    eventBus.subscribe('SellerSuspended', async (event: any) => {
      try {
        console.log(`Seller ${event.sellerId} suspended, Buy Box recomputation needed`);
      } catch (error: any) {
        console.error('Error handling SellerSuspended:', error);
      }
    });
  }
}
