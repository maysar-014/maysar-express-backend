import { sagaOrchestrator } from '../../shared/sagaFramework';

// User Management Sagas
import { 
  MultiRoleUserRegistrationSaga, 
  BulkUserOperationsSaga, 
  UserSuspensionSaga 
} from './userManagementSaga';

// KYC Workflow Sagas
import { 
  DocumentVerificationWorkflowSaga, 
  RiskAssessmentSaga, 
  ComplianceReportingSaga 
} from './kycWorkflowSaga';

// Transaction Monitoring Sagas
import { 
  TransactionMonitoringSaga, 
  CommissionProcessingSaga, 
  DisputeResolutionSaga 
} from './transactionMonitoringSaga';

// System Administration Sagas
import { 
  ServiceHealthMonitoringSaga, 
  SecurityIncidentResponseSaga 
} from './systemAdministrationSaga';

// Dashboard Management Sagas
import { 
  DashboardAnalyticsSaga, 
  PlatformUserManagementSaga, 
  SellerManagementSaga, 
  EnablerManagementSaga, 
  SupplierManagementSaga 
} from './dashboardManagementSaga';

// Compliance & Audit Sagas
import { 
  ComplianceMonitoringSaga, 
  AuditLogManagementSaga, 
  ComplianceReportGenerationSaga 
} from './complianceAuditSaga';

export class AdminSagaRegistry {
  static initialize(): void {
    // User Management Sagas
    sagaOrchestrator.registerSaga('MultiRoleUserRegistration', new MultiRoleUserRegistrationSaga());
    sagaOrchestrator.registerSaga('BulkUserOperations', new BulkUserOperationsSaga());
    sagaOrchestrator.registerSaga('UserSuspension', new UserSuspensionSaga());

    // KYC Workflow Sagas
    sagaOrchestrator.registerSaga('DocumentVerificationWorkflow', new DocumentVerificationWorkflowSaga());
    sagaOrchestrator.registerSaga('RiskAssessment', new RiskAssessmentSaga());
    sagaOrchestrator.registerSaga('ComplianceReporting', new ComplianceReportingSaga());

    // Transaction Monitoring Sagas
    sagaOrchestrator.registerSaga('TransactionMonitoring', new TransactionMonitoringSaga());
    sagaOrchestrator.registerSaga('CommissionProcessing', new CommissionProcessingSaga());
    sagaOrchestrator.registerSaga('DisputeResolution', new DisputeResolutionSaga());

    // System Administration Sagas
    sagaOrchestrator.registerSaga('ServiceHealthMonitoring', new ServiceHealthMonitoringSaga());
    sagaOrchestrator.registerSaga('SecurityIncidentResponse', new SecurityIncidentResponseSaga());

    // Dashboard Management Sagas
    sagaOrchestrator.registerSaga('DashboardAnalytics', new DashboardAnalyticsSaga());
    sagaOrchestrator.registerSaga('PlatformUserManagement', new PlatformUserManagementSaga());
    sagaOrchestrator.registerSaga('SellerManagement', new SellerManagementSaga());
    sagaOrchestrator.registerSaga('EnablerManagement', new EnablerManagementSaga());
    sagaOrchestrator.registerSaga('SupplierManagement', new SupplierManagementSaga());

    // Compliance & Audit Sagas
    sagaOrchestrator.registerSaga('ComplianceMonitoring', new ComplianceMonitoringSaga());
    sagaOrchestrator.registerSaga('AuditLogManagement', new AuditLogManagementSaga());
    sagaOrchestrator.registerSaga('ComplianceReportGeneration', new ComplianceReportGenerationSaga());

    console.log('Admin Console Sagas registered:', sagaOrchestrator.listSagas());
  }

  static async executeUserRegistration(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('MultiRoleUserRegistration', data);
  }

  static async executeBulkUserOperations(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('BulkUserOperations', data);
  }

  static async executeUserSuspension(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('UserSuspension', data);
  }

  static async executeDocumentVerification(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('DocumentVerificationWorkflow', data);
  }

  static async executeRiskAssessment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('RiskAssessment', data);
  }

  static async executeTransactionMonitoring(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('TransactionMonitoring', data);
  }

  static async executeCommissionProcessing(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('CommissionProcessing', data);
  }

  static async executeDisputeResolution(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('DisputeResolution', data);
  }

  static async executeServiceHealthMonitoring(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ServiceHealthMonitoring', data);
  }

  static async executeSecurityIncidentResponse(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SecurityIncidentResponse', data);
  }

  static async executeDashboardAnalytics(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('DashboardAnalytics', data);
  }

  static async executePlatformUserManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('PlatformUserManagement', data);
  }

  static async executeSellerManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SellerManagement', data);
  }

  static async executeEnablerManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('EnablerManagement', data);
  }

  static async executeSupplierManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SupplierManagement', data);
  }

  static async executeComplianceMonitoring(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ComplianceMonitoring', data);
  }

  static async executeAuditLogManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('AuditLogManagement', data);
  }

  static async executeComplianceReportGeneration(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('ComplianceReportGeneration', data);
  }
}

// Initialize all admin sagas on module load
AdminSagaRegistry.initialize();