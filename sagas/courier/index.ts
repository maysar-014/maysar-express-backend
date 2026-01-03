import { sagaOrchestrator } from '../../shared/sagaFramework';

// Delivery Management Sagas
import { 
  DeliveryAssignmentSaga, 
  DeliveryCompletionSaga 
} from './deliveryManagementSaga';

// Route Optimization Saga
import { RouteOptimizationSaga } from './routeOptimizationSaga';

// Performance & Earnings Sagas
import { 
  PerformanceTrackingSaga, 
  EarningsCalculationSaga 
} from './performanceEarningsSaga';

// Courier Operations Sagas
import { 
  CourierDashboardSaga,
  VehicleManagementSaga,
  CourierKYCSaga,
  CourierSettingsSaga,
  CourierSupportSaga
} from './courierOperationsSaga';

export class CourierSagaRegistry {
  static initialize(): void {
    // Delivery Management Sagas
    sagaOrchestrator.registerSaga('DeliveryAssignment', new DeliveryAssignmentSaga());
    sagaOrchestrator.registerSaga('DeliveryCompletion', new DeliveryCompletionSaga());
    
    // Route & Navigation Sagas
    sagaOrchestrator.registerSaga('RouteOptimization', new RouteOptimizationSaga());
    
    // Performance & Earnings Sagas
    sagaOrchestrator.registerSaga('PerformanceTracking', new PerformanceTrackingSaga());
    sagaOrchestrator.registerSaga('EarningsCalculation', new EarningsCalculationSaga());
    
    // Courier Operations Sagas
    sagaOrchestrator.registerSaga('CourierDashboard', new CourierDashboardSaga());
    sagaOrchestrator.registerSaga('VehicleManagement', new VehicleManagementSaga());
    sagaOrchestrator.registerSaga('CourierKYC', new CourierKYCSaga());
    sagaOrchestrator.registerSaga('CourierSettings', new CourierSettingsSaga());
    sagaOrchestrator.registerSaga('CourierSupport', new CourierSupportSaga());

    console.log('Courier Console Sagas registered:', sagaOrchestrator.listSagas().filter(name => 
      ['DeliveryAssignment', 'DeliveryCompletion', 'RouteOptimization', 
       'PerformanceTracking', 'EarningsCalculation', 'CourierDashboard',
       'VehicleManagement', 'CourierKYC', 'CourierSettings', 'CourierSupport'].includes(name)
    ));
  }

  // Delivery Management
  static async executeDeliveryAssignment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('DeliveryAssignment', data);
  }

  static async executeDeliveryCompletion(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('DeliveryCompletion', data);
  }

  // Route Planning
  static async executeRouteOptimization(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('RouteOptimization', data);
  }

  // Performance & Earnings
  static async executePerformanceTracking(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('PerformanceTracking', data);
  }

  static async executeEarningsCalculation(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('EarningsCalculation', data);
  }

  // Dashboard & Operations
  static async executeCourierDashboard(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CourierDashboard', data);
  }

  static async executeVehicleManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('VehicleManagement', data);
  }

  // KYC & Settings
  static async executeCourierKYC(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CourierKYC', data);
  }

  static async executeCourierSettings(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CourierSettings', data);
  }

  // Support
  static async executeCourierSupport(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CourierSupport', data);
  }
}

// Initialize all courier sagas on module load
CourierSagaRegistry.initialize();