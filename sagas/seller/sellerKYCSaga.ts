import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Seller KYC Workflow Saga (/seller/kyc-verification)
export class SellerKYCSaga extends BaseSaga {
  constructor() {
    super('SellerKYC', [
      new SagaStep('DOCUMENT_SUBMISSION', async (context: SagaContext) => {
        const { sellerId, documents } = context.data;
        
        await eventBus.publish({
          type: 'SellerKYCDocumentsSubmitted',
          data: { sellerId, documents, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { documentsSubmitted: true } };
      }),
      
      new SagaStep('DOCUMENT_VALIDATION', async (context: SagaContext) => {
        const { sellerId, documents } = context.data;
        
        await eventBus.publish({
          type: 'SellerKYCValidationInitiated',
          data: { sellerId, documents, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { validationInitiated: true } };
      }),
      
      new SagaStep('KYC_REVIEW', async (context: SagaContext) => {
        const { sellerId, validationResults } = context.data;
        
        await eventBus.publish({
          type: 'SellerKYCReviewCompleted',
          data: { sellerId, validationResults, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { reviewCompleted: true } };
      }),
      
      new SagaStep('KYC_STATUS_UPDATE', async (context: SagaContext) => {
        const { sellerId, kycStatus } = context.data;
        
        await eventBus.publish({
          type: 'SellerKYCStatusUpdated',
          data: { sellerId, kycStatus, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { statusUpdated: true } };
      }),
      
      new SagaStep('KYC_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId, kycStatus } = context.data;
        
        await eventBus.publish({
          type: 'SellerKYCNotificationSent',
          data: { sellerId, kycStatus, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}