import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Seller Support Saga (/seller/support)
export class SellerSupportSaga extends BaseSaga {
  constructor() {
    super('SellerSupport', [
      new SagaStep('SUPPORT_REQUEST', async (context: SagaContext) => {
        const { sellerId, supportRequest } = context.data;
        
        await eventBus.publish({
          type: 'SellerSupportRequestCreated',
          data: { sellerId, supportRequest, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestCreated: true } };
      }),
      
      new SagaStep('SUPPORT_ASSIGNMENT', async (context: SagaContext) => {
        const { sellerId, supportRequestId } = context.data;
        
        await eventBus.publish({
          type: 'SupportRequestAssigned',
          data: { sellerId, supportRequestId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestAssigned: true } };
      }),
      
      new SagaStep('SUPPORT_RESOLUTION', async (context: SagaContext) => {
        const { sellerId, supportRequestId, resolution } = context.data;
        
        await eventBus.publish({
          type: 'SellerSupportRequestResolved',
          data: { sellerId, supportRequestId, resolution, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestResolved: true } };
      }),
      
      new SagaStep('SUPPORT_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId, supportRequestId } = context.data;
        
        await eventBus.publish({
          type: 'SupportResolutionNotificationSent',
          data: { sellerId, supportRequestId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}