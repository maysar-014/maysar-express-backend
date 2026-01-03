import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Performance Tracking Saga (/courier/performance)
export class PerformanceTrackingSaga extends BaseSaga {
  constructor() {
    super('PerformanceTracking', [
      new SagaStep('METRICS_COLLECTION', async (context: SagaContext) => {
        const { courierId, period } = context.data;
        
        await eventBus.publish({
          type: 'CourierMetricsCollected',
          data: { courierId, period, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { metricsCollected: true } };
      }),
      
      new SagaStep('PERFORMANCE_ANALYSIS', async (context: SagaContext) => {
        const { courierId, metrics } = context.data;
        
        await eventBus.publish({
          type: 'PerformanceAnalysisCompleted',
          data: { courierId, analysis: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { analysisCompleted: true } };
      }),
      
      new SagaStep('PERFORMANCE_REPORT', async (context: SagaContext) => {
        const { courierId, analysis } = context.data;
        
        await eventBus.publish({
          type: 'PerformanceReportGenerated',
          data: { courierId, report: {}, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { reportGenerated: true } };
      })
    ]);
  }
}

// Earnings Calculation Saga (/courier/earnings)
export class EarningsCalculationSaga extends BaseSaga {
  constructor() {
    super('EarningsCalculation', [
      new SagaStep('DELIVERY_COMPLETION', async (context: SagaContext) => {
        const { courierId, deliveryId, completionTime } = context.data;
        
        await eventBus.publish({
          type: 'DeliveryCompletionRecorded',
          data: { courierId, deliveryId, completionTime, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { completionRecorded: true } };
      }),
      
      new SagaStep('COMMISSION_CALCULATION', async (context: SagaContext) => {
        const { courierId, deliveryId, baseRate } = context.data;
        
        await eventBus.publish({
          type: 'CommissionCalculated',
          data: { courierId, deliveryId, commission: baseRate * 0.8, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { commissionCalculated: true } };
      }),
      
      new SagaStep('BONUS_ASSESSMENT', async (context: SagaContext) => {
        const { courierId, deliveryId, performanceMetrics } = context.data;
        
        await eventBus.publish({
          type: 'BonusAssessed',
          data: { courierId, deliveryId, bonus: 0, sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { bonusAssessed: true } };
      }),
      
      new SagaStep('PAYOUT_SCHEDULING', async (context: SagaContext) => {
        const { courierId, totalEarnings } = context.data;
        
        await eventBus.publish({
          type: 'PayoutScheduled',
          data: { courierId, totalEarnings, payoutDate: new Date(), sagaId: context.sagaId }
        });
        
        return { status: 'COMPLETED', data: { payoutScheduled: true } };
      })
    ]);
  }
}