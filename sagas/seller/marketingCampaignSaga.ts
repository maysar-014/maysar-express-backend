import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Pricing Management Saga (/seller/pricing-discounts)
export class PricingManagementSaga extends BaseSaga {
  constructor() {
    super('PricingManagement', [
      new SagaStep('PRICING_VALIDATION', async (context: SagaContext) => {
        const { sellerId, productId, pricing } = context.data;
        
        await eventBus.publish({
          type: 'PricingValidationRequested',
          data: { sellerId, productId, pricing, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { validationRequested: true } };
      }),
      
      new SagaStep('PRICING_UPDATE', async (context: SagaContext) => {
        const { sellerId, productId, pricing } = context.data;
        
        await eventBus.publish({
          type: 'ProductPricingUpdated',
          data: { sellerId, productId, pricing, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { pricingUpdated: true } };
      }),
      
      new SagaStep('PRICING_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId } = context.data;
        
        await eventBus.publish({
          type: 'PricingChangeNotificationSent',
          data: { sellerId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}

// Promotional Campaign Saga (/seller/promotions)
export class PromotionalCampaignSaga extends BaseSaga {
  constructor() {
    super('PromotionalCampaign', [
      new SagaStep('CAMPAIGN_VALIDATION', async (context: SagaContext) => {
        const { sellerId, campaign } = context.data;
        
        await eventBus.publish({
          type: 'CampaignValidationRequested',
          data: { sellerId, campaign, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { validationRequested: true } };
      }),
      
      new SagaStep('CAMPAIGN_CREATION', async (context: SagaContext) => {
        const { sellerId, campaign } = context.data;
        
        await eventBus.publish({
          type: 'PromotionalCampaignCreated',
          data: { sellerId, campaign, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { campaignCreated: true } };
      }),
      
      new SagaStep('CAMPAIGN_ACTIVATION', async (context: SagaContext) => {
        const { sellerId, campaignId } = context.data;
        
        await eventBus.publish({
          type: 'CampaignActivated',
          data: { sellerId, campaignId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { campaignActivated: true } };
      }),
      
      new SagaStep('CAMPAIGN_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId, campaignId } = context.data;
        
        await eventBus.publish({
          type: 'CampaignNotificationSent',
          data: { sellerId, campaignId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}