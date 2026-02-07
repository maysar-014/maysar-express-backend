import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';

export interface CampaignPricingContext {
    campaignId: string;
    // Add context properties
}

export class CampaignPricingSaga extends DistributedSagaOrchestrator<CampaignPricingContext> {
    protected sagaType = 'CampaignPricingSaga';

    constructor() {
        super(sagaLogRepository, 'campaign-service');
    }

    protected async onStart(sagaId: string, payload: CampaignPricingContext, correlationId?: string): Promise<void> {
    }

    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    }

    protected defineSteps(): SagaStep<CampaignPricingContext>[] {
        return [];
    }
}
