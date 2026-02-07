import { DistributedSagaOrchestrator } from '../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../shared/saga/saga.log';
import { v4 as uuidv4 } from 'uuid';

// Define the payload for starting the saga
interface MySagaPayload {
    entityId: string;
    data: any;
}

// Define the saga context (internal state)
interface MySagaContext {
    step1Result?: any;
    step2Result?: any;
}

export class MySaga extends DistributedSagaOrchestrator<MySagaPayload, MySagaContext> {
    protected sagaType = 'MySaga';

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        protected readonly outbox?: any // Inject TransactionalOutbox
    ) {
        super(sagaLogRepository, serviceName, outbox);
    }

    /**
     * 1. Start: Trigger the first step by publishing a command or executing logic
     */
    protected async onStart(sagaId: string, payload: MySagaPayload): Promise<void> {
        // Example: Validate data and publish first command
        console.log(`Starting MySaga ${sagaId} for entity ${payload.entityId}`);

        // Persist standard start step if needed, or rely on DistributedSagaOrchestrator's start logging

        // Publish command
        await this.publishCommand(
            'ServiceA.ProcessCommand',
            { sagaId, ...payload },
            sagaId
        );
    }

    /**
     * 2. Event Handlers: Handle responses from services
     */

    // Handler for Service A Success
    async handleServiceAProcessed(event: any): Promise<void> {
        const { sagaId, result } = event;

        await this.completeStep(sagaId, 'ServiceAProcessing', async (saga) => {
            // Update context if needed
            saga.context.step1Result = result;
            await this.sagaLogRepository.update(sagaId, { context: saga.context });

            // Trigger next step
            await this.publishCommand(
                'ServiceB.DoSomething',
                { sagaId, previousResult: result },
                sagaId
            );
        });
    }

    // Handler for Service A Failure
    async handleServiceAFailed(event: any): Promise<void> {
        const { sagaId, error } = event;
        await this.failStep(sagaId, 'ServiceAProcessing', error);
    }

    // Handler for Service B Success
    async handleServiceBProcessed(event: any): Promise<void> {
        const { sagaId } = event;
        // This is the final step
        await this.completeStep(sagaId, 'ServiceBProcessing');
    }

    // Handler for Service B Failure
    async handleServiceBFailed(event: any): Promise<void> {
        const { sagaId, error } = event;
        await this.failStep(sagaId, 'ServiceBProcessing', error);
    }


    /**
     * 3. Compensation: Undo changes in reverse order
     */
    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
        const saga = await this.getSagaOrThrow(sagaId);

        // Determine what needs to be compensated based on failed step or logs

        switch (failedStepName) {
            case 'ServiceBProcessing':
                // Step B failed, so we must compensate Step A
                await this.publishCommand(
                    'ServiceA.UndoProcessing',
                    { sagaId, entityId: saga.payload.entityId },
                    sagaId
                );
                break;

            case 'ServiceAProcessing':
                // Step A failed, nothing to compensate if it was the first step
                await this.markAsCompensated(sagaId);
                break;
        }
    }

    // Handle compensation success events
    async handleServiceAUndone(event: any): Promise<void> {
        const { sagaId } = event;
        await this.markAsCompensated(sagaId);
    }
}
