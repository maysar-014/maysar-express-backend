import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Task Assignment Saga (/enabler/tasks - Task Queue)
export class TaskAssignmentSaga extends BaseSaga {
  constructor() {
    super('TaskAssignment', [
      new SagaStep('TASK_CREATION', async (context: SagaContext) => {
        const { taskType, priority, territory, requirements } = context.data;
        
        await eventBus.publish({
          type: 'TaskCreated',
          data: { 
            taskId: `TASK-${Date.now()}`,
            taskType, 
            priority, 
            territory, 
            requirements,
            status: 'pending_assignment',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { taskCreated: true } };
      }),
      
      new SagaStep('ENABLER_MATCHING', async (context: SagaContext) => {
        const { taskId, territory, requirements } = context.data;
        
        const matchedEnablers = await this.findSuitableEnablers(territory, requirements);
        
        await eventBus.publish({
          type: 'EnablerMatched',
          data: { 
            taskId, 
            matchedEnablers,
            matchingCriteria: requirements,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { enablersMatched: true } };
      }),
      
      new SagaStep('ASSIGNMENT_OFFER', async (context: SagaContext) => {
        const { taskId, matchedEnablers } = context.data;
        
        for (const enabler of matchedEnablers) {
          await eventBus.publish({
            type: 'TaskAssignmentOffered',
            data: { 
              taskId, 
              enablerId: enabler.id,
              offerExpiry: new Date(Date.now() + 30 * 60 * 1000),
              sagaId: context.sagaId 
            }
          });
        }
        
        return { status: 'COMPLETED', data: { offersExtended: true } };
      }),
      
      new SagaStep('ACCEPTANCE_TRACKING', async (context: SagaContext) => {
        const { taskId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'TaskAssignmentAccepted',
          data: { 
            taskId, 
            enablerId,
            acceptedAt: new Date(),
            status: 'assigned',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { taskAssigned: true } };
      })
    ]);
  }

  private async findSuitableEnablers(territory: string, requirements: any) {
    return [
      { id: 'enabler-1', skills: ['seller_onboarding'], territory, availability: 'available' },
      { id: 'enabler-2', skills: ['training_delivery'], territory, availability: 'available' }
    ];
  }
}

// Task Completion Saga (/enabler/tasks - Task Hub)
export class TaskCompletionSaga extends BaseSaga {
  constructor() {
    super('TaskCompletion', [
      new SagaStep('COMPLETION_SUBMISSION', async (context: SagaContext) => {
        const { taskId, enablerId, completionData, evidence } = context.data;
        
        await eventBus.publish({
          type: 'TaskCompletionSubmitted',
          data: { 
            taskId, 
            enablerId,
            completionData,
            evidence,
            submittedAt: new Date(),
            status: 'pending_review',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { completionSubmitted: true } };
      }),
      
      new SagaStep('QUALITY_REVIEW', async (context: SagaContext) => {
        const { taskId, completionData, evidence } = context.data;
        
        const qualityScore = await this.assessTaskQuality(completionData, evidence);
        
        await eventBus.publish({
          type: 'TaskQualityAssessed',
          data: { 
            taskId, 
            qualityScore,
            reviewedAt: new Date(),
            requiresManualReview: qualityScore < 80,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { qualityAssessed: true } };
      }),
      
      new SagaStep('COMMISSION_CALCULATION', async (context: SagaContext) => {
        const { taskId, enablerId, taskType, qualityScore } = context.data;
        
        const commission = await this.calculateTaskCommission(taskType, qualityScore);
        
        await eventBus.publish({
          type: 'TaskCommissionCalculated',
          data: { 
            taskId, 
            enablerId,
            commission,
            qualityBonus: qualityScore > 90 ? commission * 0.1 : 0,
            calculatedAt: new Date(),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { commissionCalculated: true } };
      })
    ]);
  }

  private async assessTaskQuality(completionData: any, evidence: any): Promise<number> {
    let score = 70;
    if (evidence && evidence.photos) score += 10;
    if (evidence && evidence.documentation) score += 10;
    if (completionData.timeSpent <= completionData.estimatedTime) score += 10;
    return Math.min(100, score);
  }

  private async calculateTaskCommission(taskType: string, qualityScore: number): Promise<number> {
    const baseCommissions = {
      'seller_onboarding': 50,
      'training_delivery': 30,
      'logistics_support': 25,
      'sales_support': 20
    };
    
    const baseCommission = baseCommissions[taskType] || 20;
    return baseCommission * (qualityScore / 100);
  }
}

// Performance Evaluation Saga (/enabler/performance - Performance)
export class PerformanceEvaluationSaga extends BaseSaga {
  constructor() {
    super('PerformanceEvaluation', [
      new SagaStep('METRICS_COLLECTION', async (context: SagaContext) => {
        const { enablerId, evaluationPeriod } = context.data;
        
        const performanceMetrics = await this.collectPerformanceMetrics(enablerId, evaluationPeriod);
        
        await eventBus.publish({
          type: 'PerformanceMetricsCollected',
          data: { 
            enablerId,
            evaluationPeriod,
            metrics: performanceMetrics,
            collectedAt: new Date(),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { metricsCollected: true } };
      }),
      
      new SagaStep('KPI_ANALYSIS', async (context: SagaContext) => {
        const { enablerId, metrics } = context.data;
        
        const kpiAnalysis = await this.analyzeKPIs(metrics);
        
        await eventBus.publish({
          type: 'KPIAnalysisCompleted',
          data: { 
            enablerId,
            kpiAnalysis,
            overallScore: kpiAnalysis.overallScore,
            performanceLevel: this.determinePerformanceLevel(kpiAnalysis.overallScore),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { kpiAnalyzed: true } };
      }),
      
      new SagaStep('IMPROVEMENT_PLANNING', async (context: SagaContext) => {
        const { enablerId, kpiAnalysis, performanceLevel } = context.data;
        
        const improvementPlan = await this.createImprovementPlan(kpiAnalysis, performanceLevel);
        
        await eventBus.publish({
          type: 'ImprovementPlanCreated',
          data: { 
            enablerId,
            improvementPlan,
            targetGoals: improvementPlan.goals,
            timeline: improvementPlan.timeline,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { improvementPlanCreated: true } };
      })
    ]);
  }

  private async collectPerformanceMetrics(enablerId: string, period: any) {
    return {
      tasksCompleted: 45,
      averageQualityScore: 87,
      sellersOnboarded: 12,
      trainingsDelivered: 8,
      customerSatisfaction: 4.2,
      responseTime: 2.5,
      completionRate: 94
    };
  }

  private async analyzeKPIs(metrics: any) {
    const overallScore = (metrics.averageQualityScore + metrics.completionRate) / 2;
    return {
      overallScore: Math.round(overallScore),
      breakdown: {
        productivity: (metrics.tasksCompleted / 50) * 100,
        quality: metrics.averageQualityScore,
        impact: (metrics.sellersOnboarded / 15) * 100
      }
    };
  }

  private determinePerformanceLevel(score: number): string {
    if (score >= 90) return 'exceptional';
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    return 'needs_improvement';
  }

  private async createImprovementPlan(kpiAnalysis: any, performanceLevel: string) {
    return {
      goals: [
        { metric: 'response_time', target: 1.5, timeline: '30 days' },
        { metric: 'customer_satisfaction', target: 4.5, timeline: '60 days' }
      ],
      timeline: '90 days',
      support: ['Additional training', 'Mentorship', 'Weekly check-ins']
    };
  }
}

// Commission Calculation Saga (/enabler/earnings - Earnings Wallet)
export class EnablerCommissionCalculationSaga extends BaseSaga {
  constructor() {
    super('EnablerCommissionCalculation', [
      new SagaStep('ACTIVITY_AGGREGATION', async (context: SagaContext) => {
        const { enablerId, calculationPeriod } = context.data;
        
        const activities = await this.aggregateEnablerActivities(enablerId, calculationPeriod);
        
        await eventBus.publish({
          type: 'EnablerActivitiesAggregated',
          data: { 
            enablerId,
            calculationPeriod,
            activities,
            totalActivities: activities.length,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { activitiesAggregated: true } };
      }),
      
      new SagaStep('BASE_COMMISSION_CALCULATION', async (context: SagaContext) => {
        const { enablerId, activities } = context.data;
        
        const baseCommission = await this.calculateBaseCommission(activities);
        
        await eventBus.publish({
          type: 'BaseCommissionCalculated',
          data: { 
            enablerId,
            baseCommission,
            breakdown: baseCommission.breakdown,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { baseCommissionCalculated: true } };
      }),
      
      new SagaStep('PAYOUT_SCHEDULING', async (context: SagaContext) => {
        const { enablerId, baseCommission } = context.data;
        
        await eventBus.publish({
          type: 'PayoutScheduled',
          data: { 
            enablerId,
            payoutAmount: baseCommission.total,
            payoutDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            payoutId: `PAYOUT-${Date.now()}`,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { payoutScheduled: true } };
      })
    ]);
  }

  private async aggregateEnablerActivities(enablerId: string, period: any) {
    return [
      { type: 'seller_onboarding', count: 5, rate: 50, total: 250 },
      { type: 'training_delivery', count: 3, rate: 30, total: 90 },
      { type: 'logistics_support', count: 8, rate: 25, total: 200 }
    ];
  }

  private async calculateBaseCommission(activities: any[]) {
    const total = activities.reduce((sum, activity) => sum + activity.total, 0);
    return {
      total,
      breakdown: activities.map(activity => ({
        type: activity.type,
        count: activity.count,
        rate: activity.rate,
        subtotal: activity.total
      }))
    };
  }
}