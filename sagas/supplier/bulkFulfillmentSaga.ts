import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Bulk Order Fulfillment Saga (/supplier/bulk-fulfillment)
export class BulkOrderFulfillmentSaga extends BaseSaga {
  constructor() {
    super('BulkOrderFulfillment', [
      new SagaStep('ORDER_RECEIPT', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, orderDetails } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderReceived',
          data: { supplierId, bulkOrderId, orderDetails, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { orderReceived: true } };
      }),
      
      new SagaStep('CAPACITY_VALIDATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, orderDetails } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderCapacityValidated',
          data: { supplierId, bulkOrderId, capacityAvailable: true, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { capacityValidated: true } };
      }),
      
      new SagaStep('PRODUCTION_SCHEDULING', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderProductionScheduled',
          data: { supplierId, bulkOrderId, productionStartDate: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { productionScheduled: true } };
      }),
      
      new SagaStep('MANUFACTURING', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderManufacturingStarted',
          data: { supplierId, bulkOrderId, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { manufacturingStarted: true } };
      }),
      
      new SagaStep('QUALITY_CHECK', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderQualityChecked',
          data: { supplierId, bulkOrderId, qualityPassed: true, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { qualityChecked: true } };
      }),
      
      new SagaStep('BULK_SHIPPING', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkOrderShipped',
          data: { supplierId, bulkOrderId, trackingNumber: `BULK-${Date.now()}`, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { orderShipped: true } };
      })
    ]);
  }
}

// Bulk Shipping Coordination Saga (/supplier/bulk-fulfillment)
export class BulkShippingCoordinationSaga extends BaseSaga {
  constructor() {
    super('BulkShippingCoordination', [
      new SagaStep('SHIPPING_PLANNING', async (context: SagaContext) => {
        const { supplierId, bulkOrderId, shippingDetails } = context.data;
        
        await eventBus.publish({
          type: 'BulkShippingPlanned',
          data: { supplierId, bulkOrderId, shippingPlan: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { shippingPlanned: true } };
      }),
      
      new SagaStep('CARRIER_COORDINATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkShippingCarrierCoordinated',
          data: { supplierId, bulkOrderId, carrier: 'FreightCorp', sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { carrierCoordinated: true } };
      }),
      
      new SagaStep('LOADING_COORDINATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkShippingLoadingCompleted',
          data: { supplierId, bulkOrderId, loadingTime: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { loadingCompleted: true } };
      }),
      
      new SagaStep('TRACKING_SETUP', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkShippingTrackingSetup',
          data: { supplierId, bulkOrderId, trackingUrl: `https://track.example.com/BULK-${Date.now()}`, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { trackingSetup: true } };
      }),
      
      new SagaStep('DELIVERY_CONFIRMATION', async (context: SagaContext) => {
        const { supplierId, bulkOrderId } = context.data;
        
        await eventBus.publish({
          type: 'BulkShippingDelivered',
          data: { supplierId, bulkOrderId, deliveredAt: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { deliveryConfirmed: true } };
      })
    ]);
  }
}