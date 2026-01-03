import { sagaOrchestrator } from '../../shared/sagaFramework';

// Enabler Operations Sagas
import { 
  TaskAssignmentSaga, 
  TaskCompletionSaga, 
  PerformanceEvaluationSaga,
  EnablerCommissionCalculationSaga 
} from './enablerOperationsSaga';

// Training Management Sagas
import { 
  SellerRegistrationAssistanceSaga, 
  SellerTrainingDeliverySaga, 
  SkillDevelopmentSaga 
} from './trainingManagementSaga';

// Support Services Sagas
import { 
  LogisticsSupportSaga, 
  SalesSupportSaga, 
  EnablerKYCVerificationSaga,
  EnablerSettingsManagementSaga 
} from './supportServicesSaga';

export class EnablerSagaRegistry {
  static initialize(): void {
    // Task Management Sagas (/enabler/tasks - Task Hub, Task Queue)
    sagaOrchestrator.registerSaga('TaskAssignment', new TaskAssignmentSaga());
    sagaOrchestrator.registerSaga('TaskCompletion', new TaskCompletionSaga());
    
    // Performance & Earnings Sagas (/enabler/performance, /enabler/earnings - Performance, Earnings Wallet)
    sagaOrchestrator.registerSaga('PerformanceEvaluation', new PerformanceEvaluationSaga());
    sagaOrchestrator.registerSaga('EnablerCommissionCalculation', new EnablerCommissionCalculationSaga());
    
    // Training & Onboarding Sagas (/enabler/seller-onboarding, /enabler/training - Training Center)
    sagaOrchestrator.registerSaga('SellerRegistrationAssistance', new SellerRegistrationAssistanceSaga());
    sagaOrchestrator.registerSaga('SellerTrainingDelivery', new SellerTrainingDeliverySaga());
    sagaOrchestrator.registerSaga('SkillDevelopment', new SkillDevelopmentSaga());
    
    // Core Functions Support Sagas (Logistics Support, Sales Support)
    sagaOrchestrator.registerSaga('LogisticsSupport', new LogisticsSupportSaga());
    sagaOrchestrator.registerSaga('SalesSupport', new SalesSupportSaga());
    
    // Enabler Management Sagas (/enabler/kyc-verification, /enabler/settings - KYC Verification, Settings)
    sagaOrchestrator.registerSaga('EnablerKYCVerification', new EnablerKYCVerificationSaga());
    sagaOrchestrator.registerSaga('EnablerSettingsManagement', new EnablerSettingsManagementSaga());

    console.log('Enabler Console Sagas registered:', sagaOrchestrator.listSagas().filter(name => 
      ['TaskAssignment', 'TaskCompletion', 'PerformanceEvaluation', 'EnablerCommissionCalculation',
       'SellerRegistrationAssistance', 'SellerTrainingDelivery', 'SkillDevelopment',
       'LogisticsSupport', 'SalesSupport', 'EnablerKYCVerification', 'EnablerSettingsManagement'].includes(name)
    ));
  }

  // ===== ENABLER HUB DASHBOARD SAGAS =====
  // Dashboard aggregates data from multiple sagas for overview

  // ===== TASKS HUB & TASK QUEUE SAGAS =====
  static async executeTaskAssignment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('TaskAssignment', data);
  }

  static async executeTaskCompletion(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('TaskCompletion', data);
  }

  // ===== EARNINGS WALLET SAGAS =====
  static async executeEnablerCommissionCalculation(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('EnablerCommissionCalculation', data);
  }

  // ===== PERFORMANCE SAGAS =====
  static async executePerformanceEvaluation(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('PerformanceEvaluation', data);
  }

  // ===== TRAINING CENTER SAGAS =====
  static async executeSellerTrainingDelivery(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SellerTrainingDelivery', data);
  }

  static async executeSkillDevelopment(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SkillDevelopment', data);
  }

  // ===== SELLER ONBOARDING SAGAS =====
  static async executeSellerRegistrationAssistance(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SellerRegistrationAssistance', data);
  }

  // ===== KYC VERIFICATION SAGAS =====
  static async executeEnablerKYCVerification(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('EnablerKYCVerification', data);
  }

  // ===== SETTINGS SAGAS =====
  static async executeEnablerSettingsManagement(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('EnablerSettingsManagement', data);
  }

  // ===== CORE FUNCTIONS: LOGISTICS SUPPORT SAGAS =====
  static async executeLogisticsSupport(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('LogisticsSupport', data);
  }

  // ===== CORE FUNCTIONS: SALES SUPPORT SAGAS =====
  static async executeSalesSupport(data: any): Promise<string> {
    return await sagaOrchestrator.executeSaga('SalesSupport', data);
  }

  // ===== ENABLER DASHBOARD DATA AGGREGATION =====
  static async getEnablerDashboardData(enablerId: string): Promise<any> {
    // Aggregate data from multiple sagas for dashboard display
    return {
      activeTasks: await this.getActiveTasks(enablerId),
      todaysEarnings: await this.getTodaysEarnings(enablerId),
      performanceMetrics: await this.getPerformanceMetrics(enablerId),
      upcomingTraining: await this.getUpcomingTraining(enablerId),
      recentActivities: await this.getRecentActivities(enablerId)
    };
  }

  private static async getActiveTasks(enablerId: string): Promise<any> {
    // Query active tasks for enabler
    return {
      total: 5,
      pending: 2,
      inProgress: 3,
      urgent: 1
    };
  }

  private static async getTodaysEarnings(enablerId: string): Promise<any> {
    // Calculate today's earnings
    return {
      amount: 125.50,
      tasksCompleted: 3,
      bonusEarned: 25.00
    };
  }

  private static async getPerformanceMetrics(enablerId: string): Promise<any> {
    // Get current performance metrics
    return {
      overallScore: 87,
      completionRate: 94,
      qualityScore: 89,
      customerSatisfaction: 4.3
    };
  }

  private static async getUpcomingTraining(enablerId: string): Promise<any> {
    // Get upcoming training sessions
    return [
      {
        title: 'Advanced Sales Techniques',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        duration: '2 hours'
      },
      {
        title: 'Customer Service Excellence',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        duration: '1.5 hours'
      }
    ];
  }

  private static async getRecentActivities(enablerId: string): Promise<any> {
    // Get recent activities for activity feed
    return [
      {
        type: 'task_completed',
        description: 'Completed seller onboarding for TechStore',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        earnings: 50.00
      },
      {
        type: 'training_delivered',
        description: 'Delivered product listing training',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        earnings: 30.00
      },
      {
        type: 'support_provided',
        description: 'Resolved logistics issue for seller',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        earnings: 25.00
      }
    ];
  }
}

// Initialize all enabler sagas on module load
EnablerSagaRegistry.initialize();

// Export individual saga execution functions for direct use
export const {
  executeTaskAssignment,
  executeTaskCompletion,
  executePerformanceEvaluation,
  executeEnablerCommissionCalculation,
  executeSellerRegistrationAssistance,
  executeSellerTrainingDelivery,
  executeSkillDevelopment,
  executeLogisticsSupport,
  executeSalesSupport,
  executeEnablerKYCVerification,
  executeEnablerSettingsManagement,
  getEnablerDashboardData
} = EnablerSagaRegistry;