// @ts-nocheck
import { BaseEventHandler } from './index';
import { ICampaignRepository } from '../../domain/interfaces';

export interface CategoryDeletedEvent {
    eventType: 'CategoryDeleted';
    payload: {
        categoryId: string;
    };
}

export class CategoryDeletedHandler extends BaseEventHandler {
    readonly eventType = 'CategoryDeleted';

    constructor(
        private readonly campaignRepository: ICampaignRepository
    ) {
        super();
    }

    async handle(event: CategoryDeletedEvent): Promise<void> {
        this.validateEvent(event);
        const { categoryId } = event.payload;

        this.logEventProcessing(event, `Removing category ${categoryId} from all campaigns`);

        const campaigns = await this.campaignRepository.findAll({ categoryId });

        for (const campaign of campaigns) {
            campaign.removeCategory(categoryId);
            await this.campaignRepository.save(campaign);
        }
    }
}
