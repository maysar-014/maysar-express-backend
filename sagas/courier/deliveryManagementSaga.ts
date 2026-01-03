import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Delivery Assignment Saga (/courier/deliveries)
export class DeliveryAssignmentSaga extends BaseSaga {
  constructor() {
    super('DeliveryAssignment', [
      new SagaStep('DELIVERY_MATCHING', async (context: SagaContext) => {
        const { courierId, location, availability } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryMatchingInitiated',
          data: { courierId, location, availability, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { matchingInitiated: true } };
      }),
      
      new SagaStep('ASSIGNMENT_OFFER', async (context: SagaContext) => {
        const { courierId, deliveryId } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryAssignmentOffered',
          data: { courierId, deliveryId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { offerSent: true } };
      }),
      
      new SagaStep('ASSIGNMENT_ACCEPTANCE', async (context: SagaContext) => {
        const { courierId, deliveryId, accepted } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryAssignmentAccepted',
          data: { courierId, deliveryId, accepted, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { assignmentAccepted: accepted } };
      })
    ]);
  }
}

// Delivery Completion Saga (/courier/deliveries)
export class DeliveryCompletionSaga extends BaseSaga {
  constructor() {
    super('DeliveryCompletion', [
      new SagaStep('DELIVERY_ATTEMPT', async (context: SagaContext) => {
        const { courierId, deliveryId, location } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryAttemptStarted',
          data: { courierId, deliveryId, location, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { attemptStarted: true } };
      }),
      
      new SagaStep('DELIVERY_CONFIRMATION', async (context: SagaContext) => {
        const { courierId, deliveryId, status, proof } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryConfirmed',
          data: { courierId, deliveryId, status, proof, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { deliveryConfirmed: true } };
      }),
      
      new SagaStep('EARNINGS_UPDATE', async (context: SagaContext) => {
        const { courierId, deliveryId, earnings } = context.data;
        
        await eventBus.publish({
          type: 'CourierEarningsUpdated',
          data: { courierId, deliveryId, earnings, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { earningsUpdated: true } };
      })
    ]);
  }
}