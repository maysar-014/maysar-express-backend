import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Enabler Request Saga (/seller/request-enablers)
export class EnablerCollaborationSaga extends BaseSaga {
  constructor() {
    super('EnablerCollaboration', [
      new SagaStep('ENABLER_REQUEST', async (context: SagaContext) => {
        const { sellerId, requestDetails } = context.data;
        
        await eventBus.publish({
          type: 'EnablerAssistanceRequested',
          data: { sellerId, requestDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestSubmitted: true } };
      }),
      
      new SagaStep('ENABLER_MATCHING', async (context: SagaContext) => {
        const { sellerId, requestDetails } = context.data;
        
        await eventBus.publish({
          type: 'EnablerMatchingInitiated',
          data: { sellerId, requestDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { matchingInitiated: true } };
      }),
      
      new SagaStep('COLLABORATION_SETUP', async (context: SagaContext) => {
        const { sellerId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'EnablerCollaborationEstablished',
          data: { sellerId, enablerId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { collaborationEstablished: true } };
      }),
      
      new SagaStep('COLLABORATION_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'CollaborationNotificationSent',
          data: { sellerId, enablerId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}