import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Payment Management Saga (/seller/payments-payouts)
export class PaymentManagementSaga extends BaseSaga {
  constructor() {
    super('PaymentManagement', [
      new SagaStep('PAYOUT_REQUEST', async (context: SagaContext) => {
        const { sellerId, payoutDetails } = context.data;
        
        await eventBus.publish({
          type: 'SellerPayoutRequested',
          data: { sellerId, payoutDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { payoutRequested: true } };
      }),
      
      new SagaStep('PAYOUT_VALIDATION', async (context: SagaContext) => {
        const { sellerId, payoutDetails } = context.data;
        
        await eventBus.publish({
          type: 'PayoutValidationInitiated',
          data: { sellerId, payoutDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { validationInitiated: true } };
      }),
      
      new SagaStep('PAYOUT_PROCESSING', async (context: SagaContext) => {
        const { sellerId, payoutId } = context.data;
        
        await eventBus.publish({
          type: 'SellerPayoutProcessed',
          data: { sellerId, payoutId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { payoutProcessed: true } };
      }),
      
      new SagaStep('PAYOUT_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId, payoutId } = context.data;
        
        await eventBus.publish({
          type: 'PayoutNotificationSent',
          data: { sellerId, payoutId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}