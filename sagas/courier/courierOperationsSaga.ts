import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Courier Dashboard Saga (/courier/dashboard)
export class CourierDashboardSaga extends BaseSaga {
  constructor() {
    super('CourierDashboard', [
      new SagaStep('DASHBOARD_DATA_COLLECTION', async (context: SagaContext) => {
        const { courierId } = context.data;
        
        await eventBus.publish({
          type: 'CourierDashboardDataRequested',
          data: { courierId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { dataRequested: true } };
      }),
      
      new SagaStep('ACTIVE_DELIVERIES_UPDATE', async (context: SagaContext) => {
        const { courierId, activeDeliveries } = context.data;
        
        await eventBus.publish({
          type: 'ActiveDeliveriesUpdated',
          data: { courierId, activeDeliveries, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { deliveriesUpdated: true } };
      }),
      
      new SagaStep('DASHBOARD_REFRESH', async (context: SagaContext) => {
        const { courierId } = context.data;
        
        await eventBus.publish({
          type: 'CourierDashboardRefreshed',
          data: { courierId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { dashboardRefreshed: true } };
      })
    ]);
  }
}

// Vehicle Management Saga (/courier/vehicle)
export class VehicleManagementSaga extends BaseSaga {
  constructor() {
    super('VehicleManagement', [
      new SagaStep('VEHICLE_REGISTRATION', async (context: SagaContext) => {
        const { courierId, vehicleDetails } = context.data;
        
        await eventBus.publish({
          type: 'VehicleRegistered',
          data: { courierId, vehicleDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { vehicleRegistered: true } };
      }),
      
      new SagaStep('MAINTENANCE_SCHEDULING', async (context: SagaContext) => {
        const { courierId, vehicleId, maintenanceType } = context.data;
        
        await eventBus.publish({
          type: 'MaintenanceScheduled',
          data: { courierId, vehicleId, maintenanceType, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { maintenanceScheduled: true } };
      }),
      
      new SagaStep('VEHICLE_STATUS_UPDATE', async (context: SagaContext) => {
        const { courierId, vehicleId, status } = context.data;
        
        await eventBus.publish({
          type: 'VehicleStatusUpdated',
          data: { courierId, vehicleId, status, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { statusUpdated: true } };
      })
    ]);
  }
}

// Courier KYC Saga (/courier/kyc-verification)
export class CourierKYCSaga extends BaseSaga {
  constructor() {
    super('CourierKYC', [
      new SagaStep('DOCUMENT_SUBMISSION', async (context: SagaContext) => {
        const { courierId, documents } = context.data;
        
        await eventBus.publish({
          type: 'CourierKYCDocumentsSubmitted',
          data: { courierId, documents, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { documentsSubmitted: true } };
      }),
      
      new SagaStep('DOCUMENT_VERIFICATION', async (context: SagaContext) => {
        const { courierId, documents } = context.data;
        
        await eventBus.publish({
          type: 'CourierKYCVerificationCompleted',
          data: { courierId, verificationStatus: 'verified', sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { verificationCompleted: true } };
      }),
      
      new SagaStep('KYC_STATUS_UPDATE', async (context: SagaContext) => {
        const { courierId, verificationStatus } = context.data;
        
        await eventBus.publish({
          type: 'CourierKYCStatusUpdated',
          data: { courierId, verificationStatus, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { statusUpdated: true } };
      })
    ]);
  }
}

// Courier Settings Saga (/courier/settings)
export class CourierSettingsSaga extends BaseSaga {
  constructor() {
    super('CourierSettings', [
      new SagaStep('SETTINGS_UPDATE', async (context: SagaContext) => {
        const { courierId, settings } = context.data;
        
        await eventBus.publish({
          type: 'CourierSettingsUpdated',
          data: { courierId, settings, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { settingsUpdated: true } };
      }),
      
      new SagaStep('PREFERENCES_SYNC', async (context: SagaContext) => {
        const { courierId, preferences } = context.data;
        
        await eventBus.publish({
          type: 'CourierPreferencesSynced',
          data: { courierId, preferences, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { preferencesSynced: true } };
      })
    ]);
  }
}

// Courier Support Saga (/courier/support)
export class CourierSupportSaga extends BaseSaga {
  constructor() {
    super('CourierSupport', [
      new SagaStep('SUPPORT_REQUEST', async (context: SagaContext) => {
        const { courierId, supportRequest } = context.data;
        
        await eventBus.publish({
          type: 'CourierSupportRequestCreated',
          data: { courierId, supportRequest, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestCreated: true } };
      }),
      
      new SagaStep('SUPPORT_ASSIGNMENT', async (context: SagaContext) => {
        const { courierId, supportRequestId } = context.data;
        
        await eventBus.publish({
          type: 'CourierSupportRequestAssigned',
          data: { courierId, supportRequestId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestAssigned: true } };
      }),
      
      new SagaStep('SUPPORT_RESOLUTION', async (context: SagaContext) => {
        const { courierId, supportRequestId, resolution } = context.data;
        
        await eventBus.publish({
          type: 'CourierSupportRequestResolved',
          data: { courierId, supportRequestId, resolution, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requestResolved: true } };
      })
    ]);
  }
}