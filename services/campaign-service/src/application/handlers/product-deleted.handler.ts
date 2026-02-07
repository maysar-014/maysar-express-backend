import { BaseEventHandler } from './index';
import { ICampaignRepository } from '../../domain/interfaces';
import { CampaignMapper } from '../mappers/campaign.mapper';

export interface ProductDeletedEvent {
    eventType: 'ProductDeleted';
    payload: {
        productId: string;
    };
}

export class ProductDeletedHandler extends BaseEventHandler {
    readonly eventType = 'ProductDeleted';

    constructor(
        private readonly campaignRepository: ICampaignRepository
    ) {
        super();
    }

    async handle(event: ProductDeletedEvent): Promise<void> {
        this.validateEvent(event);
        const { productId } = event.payload;

        this.logEventProcessing(event, `Removing product ${productId} from all campaigns`);

        // In a real implementation, we would search for campaigns containing this product
        // and remove it. For now, we simulate the repository call.
        // This is a simplified version.
        const campaigns = await this.campaignRepository.findAll({ productId });

        for (const campaign of campaigns) {
            campaign.removeProduct(productId);
            await this.campaignRepository.save(campaign);
        }
    }
}
