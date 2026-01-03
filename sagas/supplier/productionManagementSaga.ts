import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Production Planning Saga (/supplier/production)
export class ProductionPlanningSaga extends BaseSaga {
  constructor() {
    super('ProductionPlanning', [
      new SagaStep('ORDER_ANALYSIS', async (context: SagaContext) => {
        const { supplierId, orders } = context.data;
        
        await eventBus.publish({
          type: 'ProductionOrdersAnalyzed',
          data: { supplierId, orders, analysis: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { ordersAnalyzed: true } };
      }),
      
      new SagaStep('CAPACITY_CHECK', async (context: SagaContext) => {
        const { supplierId, orders } = context.data;
        
        await eventBus.publish({
          type: 'ProductionCapacityChecked',
          data: { supplierId, orders, capacity: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { capacityChecked: true } };
      }),
      
      new SagaStep('SCHEDULE_CREATION', async (context: SagaContext) => {
        const { supplierId, orders, capacity } = context.data;
        
        await eventBus.publish({
          type: 'ProductionScheduleCreated',
          data: { supplierId, schedule: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { scheduleCreated: true } };
      }),
      
      new SagaStep('RESOURCE_ALLOCATION', async (context: SagaContext) => {
        const { supplierId, schedule } = context.data;
        
        await eventBus.publish({
          type: 'ProductionResourcesAllocated',
          data: { supplierId, resources: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { resourcesAllocated: true } };
      })
    ]);
  }
}

// Quality Control Saga (/supplier/production)
export class QualityControlSaga extends BaseSaga {
  constructor() {
    super('QualityControl', [
      new SagaStep('QUALITY_INSPECTION', async (context: SagaContext) => {
        const { supplierId, batchId, products } = context.data;
        
        await eventBus.publish({
          type: 'QualityInspectionStarted',
          data: { supplierId, batchId, products, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { inspectionStarted: true } };
      }),
      
      new SagaStep('QUALITY_TESTING', async (context: SagaContext) => {
        const { supplierId, batchId } = context.data;
        
        await eventBus.publish({
          type: 'QualityTestingCompleted',
          data: { supplierId, batchId, testResults: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { testingCompleted: true } };
      }),
      
      new SagaStep('QUALITY_APPROVAL', async (context: SagaContext) => {
        const { supplierId, batchId, testResults } = context.data;
        
        await eventBus.publish({
          type: 'QualityApprovalGranted',
          data: { supplierId, batchId, approved: true, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { qualityApproved: true } };
      }),
      
      new SagaStep('QUALITY_CERTIFICATION', async (context: SagaContext) => {
        const { supplierId, batchId } = context.data;
        
        await eventBus.publish({
          type: 'QualityCertificateIssued',
          data: { supplierId, batchId, certificateId: `QC-${Date.now()}`, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { certificateIssued: true } };
      })
    ]);
  }
}

// Raw Material Procurement Saga (/supplier/production)
export class RawMaterialProcurementSaga extends BaseSaga {
  constructor() {
    super('RawMaterialProcurement', [
      new SagaStep('MATERIAL_REQUIREMENT_ANALYSIS', async (context: SagaContext) => {
        const { supplierId, productionPlan } = context.data;
        
        await eventBus.publish({
          type: 'MaterialRequirementsAnalyzed',
          data: { supplierId, requirements: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { requirementsAnalyzed: true } };
      }),
      
      new SagaStep('SUPPLIER_SELECTION', async (context: SagaContext) => {
        const { supplierId, requirements } = context.data;
        
        await eventBus.publish({
          type: 'MaterialSuppliersSelected',
          data: { supplierId, selectedSuppliers: [], sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { suppliersSelected: true } };
      }),
      
      new SagaStep('PURCHASE_ORDER_CREATION', async (context: SagaContext) => {
        const { supplierId, selectedSuppliers } = context.data;
        
        await eventBus.publish({
          type: 'MaterialPurchaseOrderCreated',
          data: { supplierId, purchaseOrderId: `PO-${Date.now()}`, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { purchaseOrderCreated: true } };
      }),
      
      new SagaStep('MATERIAL_DELIVERY_TRACKING', async (context: SagaContext) => {
        const { supplierId, purchaseOrderId } = context.data;
        
        await eventBus.publish({
          type: 'MaterialDeliveryTracked',
          data: { supplierId, purchaseOrderId, deliveryStatus: 'delivered', sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { deliveryTracked: true } };
      })
    ]);
  }
}