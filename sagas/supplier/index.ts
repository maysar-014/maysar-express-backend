import { sagaOrchestrator } from '../../shared/sagaFramework';

// Production Management Sagas
import { 
  ProductionPlanningSaga, 
  QualityControlSaga, 
  RawMaterialProcurementSaga 
} from './productionManagementSaga';

// Bulk Fulfillment Sagas
import { 
  BulkOrderFulfillmentSaga, 
  BulkShippingCoordinationSaga 
} from './bulkFulfillmentSaga';

// Pricing & Payment Sagas
import { 
  WholesalePricingSaga, 
  SupplierPaymentProcessingSaga 
} from './pricingPaymentSaga';

export class SupplierSagaRegistry {
  static initialize(): void {
    // Production Management Sagas
    sagaOrchestrator.registerSaga('ProductionPlanning', new ProductionPlanningSaga());
    sagaOrchestrator.registerSaga('QualityControl', new QualityControlSaga());
    sagaOrchestrator.registerSaga('RawMaterialProcurement', new RawMaterialProcurementSaga());
    
    // Bulk Fulfillment Sagas
    sagaOrchestrator.registerSaga('BulkOrderFulfillment', new BulkOrderFulfillmentSaga());
    sagaOrchestrator.registerSaga('BulkShippingCoordination', new BulkShippingCoordinationSaga());
    
    // Pricing & Payment Sagas
    sagaOrchestrator.registerSaga('WholesalePricing', new WholesalePricingSaga());
    sagaOrchestrator.registerSaga('SupplierPaymentProcessing', new SupplierPaymentProcessingSaga());

    console.log('Supplier Console Sagas registered:', sagaOrchestrator.listSagas().filter(name => 
      ['ProductionPlanning', 'QualityControl', 'RawMaterialProcurement', 
       'BulkOrderFulfillment', 'BulkShippingCoordination', 
       'WholesalePricing', 'SupplierPaymentProcessing'].includes(name)
    ));
  }

  // Production Management
  static async executeProductionPlanning(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ProductionPlanning', data);
  }

  static async executeQualityControl(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('QualityControl', data);
  }

  static async executeRawMaterialProcurement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('RawMaterialProcurement', data);
  }

  // Bulk Fulfillment
  static async executeBulkOrderFulfillment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('BulkOrderFulfillment', data);
  }

  static async executeBulkShippingCoordination(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('BulkShippingCoordination', data);
  }

  // Pricing & Payment
  static async executeWholesalePricing(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('WholesalePricing', data);
  }

  static async executeSupplierPaymentProcessing(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SupplierPaymentProcessing', data);
  }
}

// Initialize all supplier sagas on module load
SupplierSagaRegistry.initialize();