import { BaseSaga } from './saga-base';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';

export class CampaignLifecycleSaga extends BaseSaga {
    readonly sagaId: string;
    readonly sagaType = 'CampaignLifecycle';

    constructor(
        private readonly campaignRepository: ICampaignRepository,
        campaignId: string
    ) {
        super();
        this.sagaId = `lifecycle-${campaignId}`;
        this.state = { campaignId };
    }

    protected initializeState(context: any): void {
        this.state = { ...this.state, ...context };
    }

    protected async executeNextStep(): Promise<void> {
        // Logic for lifecycle transitions
    }

    protected async processEvent(event: any): Promise<void> {
        // Logic for handling domain events
    }
}
