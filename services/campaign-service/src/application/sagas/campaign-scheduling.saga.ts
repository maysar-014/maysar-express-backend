import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';

export interface CampaignSchedulingContext {
    campaignId: string;
    // Add context properties
}

export class CampaignSchedulingSaga extends DistributedSagaOrchestrator<CampaignSchedulingContext> {
    protected sagaType = 'CampaignSchedulingSaga';

    constructor() {
        super(sagaLogRepository, 'campaign-service');
    }

    protected async onStart(sagaId: string, payload: CampaignSchedulingContext, correlationId?: string): Promise<void> {
    }

    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    }

    protected defineSteps(): SagaStep<CampaignSchedulingContext>[] {
        return [];
    }
}
