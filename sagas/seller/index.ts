import { sagaOrchestrator } from '../../shared/sagaFramework';

// Product Catalog Sagas
import { 
  ProductCatalogManagementSaga, 
  InventoryManagementSaga, 
  BulkProductOperationsSaga 
} from './productCatalogSaga';

// Order Fulfillment Sagas
import { 
  OrderProcessingSaga, 
  ShippingFulfillmentSaga, 
  ReturnProcessingSaga 
} from './orderFulfillmentSaga';

// Customer Engagement Sagas
import { 
  CustomerRelationshipSaga, 
  ReviewManagementSaga, 
  CustomerSupportTicketSaga 
} from './customerEngagementSaga';

// Sales Analytics Sagas
import { 
  DashboardAnalyticsSaga, 
  SalesAnalyticsSaga, 
  PerformanceMonitoringSaga 
} from './salesAnalyticsSaga';

export class SellerSagaRegistry {
  static initialize(): void {
    // Product Catalog & Inventory Sagas
    sagaOrchestrator.registerSaga('ProductCatalogManagement', new ProductCatalogManagementSaga());
    sagaOrchestrator.registerSaga('InventoryManagement', new InventoryManagementSaga());
    sagaOrchestrator.registerSaga('BulkProductOperations', new BulkProductOperationsSaga());

    // Order & Fulfillment Sagas
    sagaOrchestrator.registerSaga('OrderProcessing', new OrderProcessingSaga());
    sagaOrchestrator.registerSaga('ShippingFulfillment', new ShippingFulfillmentSaga());
    sagaOrchestrator.registerSaga('ReturnProcessing', new ReturnProcessingSaga());

    // Customer Engagement Sagas
    sagaOrchestrator.registerSaga('CustomerRelationship', new CustomerRelationshipSaga());
    sagaOrchestrator.registerSaga('ReviewManagement', new ReviewManagementSaga());
    sagaOrchestrator.registerSaga('CustomerSupportTicket', new CustomerSupportTicketSaga());

    // Analytics & Dashboard Sagas
    sagaOrchestrator.registerSaga('SellerDashboardAnalytics', new DashboardAnalyticsSaga());
    sagaOrchestrator.registerSaga('SalesAnalytics', new SalesAnalyticsSaga());
    sagaOrchestrator.registerSaga('PerformanceMonitoring', new PerformanceMonitoringSaga());

    console.log('Seller Console Sagas registered:', sagaOrchestrator.listSagas().filter(name => 
      ['ProductCatalogManagement', 'InventoryManagement', 'BulkProductOperations',
       'OrderProcessing', 'ShippingFulfillment', 'ReturnProcessing',
       'CustomerRelationship', 'ReviewManagement', 'CustomerSupportTicket',
       'SellerDashboardAnalytics', 'SalesAnalytics', 'PerformanceMonitoring'].includes(name)
    ));
  }

  // Product Catalog & Inventory Management
  static async executeProductCatalogManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ProductCatalogManagement', data);
  }

  static async executeInventoryManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('InventoryManagement', data);
  }

  static async executeBulkProductOperations(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('BulkProductOperations', data);
  }

  // Customer Orders & Shipping
  static async executeOrderProcessing(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('OrderProcessing', data);
  }

  static async executeShippingFulfillment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ShippingFulfillment', data);
  }

  static async executeReturnProcessing(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ReturnProcessing', data);
  }

  // Customer Management & Reviews
  static async executeCustomerRelationship(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CustomerRelationship', data);
  }

  static async executeReviewManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ReviewManagement', data);
  }

  static async executeCustomerSupportTicket(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CustomerSupportTicket', data);
  }

  // Dashboard & Analytics
  static async executeSellerDashboardAnalytics(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SellerDashboardAnalytics', data);
  }

  static async executeSalesAnalytics(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SalesAnalytics', data);
  }

  static async executePerformanceMonitoring(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('PerformanceMonitoring', data);
  }
}

// Initialize all seller sagas on module load
SellerSagaRegistry.initialize();