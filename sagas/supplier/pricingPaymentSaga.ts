import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Wholesale Pricing Saga (/supplier/wholesale-pricing)
export class WholesalePricingSaga extends BaseSaga {
  constructor() {
    super('WholesalePricing', [
      new SagaStep('COST_ANALYSIS', async (context: SagaContext) => {
        const { supplierId, products, volume } = context.data;
        
        await eventBus.publish({
          type: 'WholesaleCostAnalyzed',
          data: { supplierId, products, costAnalysis: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { costAnalyzed: true } };
      }),
      
      new SagaStep('PRICING_CALCULATION', async (context: SagaContext) => {
        const { supplierId, products, costAnalysis } = context.data;
        
        await eventBus.publish({
          type: 'WholesalePricingCalculated',
          data: { supplierId, products, pricing: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { pricingCalculated: true } };
      }),
      
      new SagaStep('PRICING_APPROVAL', async (context: SagaContext) => {
        const { supplierId, products, pricing } = context.data;
        
        await eventBus.publish({
          type: 'WholesalePricingApproved',
          data: { supplierId, products, approvedPricing: pricing, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { pricingApproved: true } };
      }),
      
      new SagaStep('PRICING_PUBLICATION', async (context: SagaContext) => {
        const { supplierId, products, approvedPricing } = context.data;
        
        await eventBus.publish({
          type: 'WholesalePricingPublished',
          data: { supplierId, products, publishedAt: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { pricingPublished: true } };
      }),
      
      new SagaStep('PRICING_NOTIFICATION', async (context: SagaContext) => {
        const { supplierId, products } = context.data;
        
        await eventBus.publish({
          type: 'WholesalePricingNotificationSent',
          data: { supplierId, products, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}

// Payment Processing Saga (/supplier/wholesale-payments)
export class SupplierPaymentProcessingSaga extends BaseSaga {
  constructor() {
    super('SupplierPaymentProcessing', [
      new SagaStep('PAYMENT_REQUEST', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, amount } = context.data;
        
        await eventBus.publish({
          type: 'SupplierPaymentRequested',
          data: { supplierId, bulkOrderId, amount, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { paymentRequested: true } };
      }),
      
      new SagaStep('PAYMENT_VALIDATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, amount } = context.data;
        
        await eventBus.publish({
          type: 'SupplierPaymentValidated',
          data: { supplierId, bulkOrderId, amount, validationPassed: true, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { paymentValidated: true } };
      }),
      
      new SagaStep('PAYMENT_PROCESSING', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, amount } = context.data;
        
        await eventBus.publish({
          type: 'SupplierPaymentProcessed',
          data: { supplierId, bulkOrderId, amount, transactionId: `TXN-${Date.now()}`, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { paymentProcessed: true } };
      }),
      
      new SagaStep('PAYMENT_CONFIRMATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, transactionId } = context.data;
        
        await eventBus.publish({
          type: 'SupplierPaymentConfirmed',
          data: { supplierId, bulkOrderId, transactionId, confirmedAt: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { paymentConfirmed: true } };
      }),
      
      new SagaStep('PAYMENT_NOTIFICATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, transactionId } = context.data;
        
        await eventBus.publish({
          type: 'SupplierPaymentNotificationSent',
          data: { supplierId, bulkOrderId, transactionId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}