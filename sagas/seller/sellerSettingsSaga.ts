import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Seller Settings Management Saga (/seller/settings)
export class SellerSettingsSaga extends BaseSaga {
  constructor() {
    super('SellerSettings', [
      new SagaStep('SETTINGS_VALIDATION', async (context: SagaContext) => {
        const { sellerId, settings } = context.data;
        
        await eventBus.publish({
          type: 'SellerSettingsValidationRequested',
          data: { sellerId, settings, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { validationRequested: true } };
      }),
      
      new SagaStep('SETTINGS_UPDATE', async (context: SagaContext) => {
        const { sellerId, settings } = context.data;
        
        await eventBus.publish({
          type: 'SellerSettingsUpdated',
          data: { sellerId, settings, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { settingsUpdated: true } };
      }),
      
      new SagaStep('SETTINGS_SYNC', async (context: SagaContext) => {
        const { sellerId, settings } = context.data;
        
        await eventBus.publish({
          type: 'SellerSettingsSynced',
          data: { sellerId, settings, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { settingsSynced: true } };
      }),
      
      new SagaStep('SETTINGS_NOTIFICATION', async (context: SagaContext) => {
        const { sellerId } = context.data;
        
        await eventBus.publish({
          type: 'SellerSettingsNotificationSent',
          data: { sellerId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { notificationSent: true } };
      })
    ]);
  }
}