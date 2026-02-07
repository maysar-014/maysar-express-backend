import { BaseSaga } from './saga-base';

export class CampaignPricingSaga extends BaseSaga {
    readonly sagaId: string;
    readonly sagaType = 'CampaignPricing';

    constructor(campaignId: string) {
        super();
        this.sagaId = `pricing-${campaignId}`;
        this.state = { campaignId };
    }

    protected initializeState(context: any): void {
        this.state = { ...this.state, ...context };
    }

    protected async executeNextStep(): Promise<void> {
        // Logic for applying/reverting pricing
    }

    protected async processEvent(event: any): Promise<void> {
        // Handle pricing related events
    }
}
