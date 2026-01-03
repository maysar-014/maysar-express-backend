import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

export interface TransactionMonitoringData {
  transactionId: string;
  amount: number;
  currency: string;
  senderId: string;
  receiverId: string;
  transactionType: string;
  metadata: any;
}

export class TransactionMonitoringSaga extends Saga {
  constructor() {
    super('TransactionMonitoring');
  }

  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    await this.addStep(new TransactionDetectionStep());
    await this.addStep(new FraudScreeningStep());
    await this.addStep(new RiskAssessmentStep());
    await this.addStep(new ApprovalDecisionStep());
    await this.addStep(new NotificationStep());
  }
}

class TransactionDetectionStep extends SagaStep {
  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    const { transactionId, amount, currency } = context.data;
    
    await eventBus.publish('TransactionDetected.v1', {
      transactionId,
      amount,
      currency,
      detectedAt: new Date(),
      sagaId: context.sagaId
    });

    await this.validateTransaction(context.data);
  }

  private async validateTransaction(data: TransactionMonitoringData): Promise<void> {
    if (data.amount <= 0) {
      throw new Error('Invalid transaction amount');
    }
    if (!data.senderId || !data.receiverId) {
      throw new Error('Missing transaction parties');
    }
  }

  async compensate(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    await eventBus.publish('TransactionDetectionCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class FraudScreeningStep extends SagaStep {
  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    const { transactionId, senderId, receiverId, amount } = context.data;
    
    await eventBus.publish('FraudScreeningStarted.v1', {
      transactionId,
      senderId,
      receiverId,
      amount,
      sagaId: context.sagaId
    });

    const fraudResult = await this.performFraudScreening(context.data);
    
    await eventBus.publish('FraudScreeningCompleted.v1', {
      transactionId,
      fraudResult,
      sagaId: context.sagaId
    });
  }

  private async performFraudScreening(data: TransactionMonitoringData): Promise<any> {
    const checks = await Promise.all([
      this.checkVelocityLimits(data.senderId, data.amount),
      this.checkSanctionsList(data.senderId, data.receiverId),
      this.checkBehavioralPatterns(data.senderId, data.transactionType),
      this.checkGeographicRisk(data.senderId, data.receiverId)
    ]);

    return {
      velocityCheck: checks[0],
      sanctionsCheck: checks[1],
      behavioralCheck: checks[2],
      geographicCheck: checks[3],
      overallRisk: this.calculateOverallRisk(checks)
    };
  }

  private async checkVelocityLimits(senderId: string, amount: number): Promise<any> {
    return {
      passed: amount < 10000,
      dailyTotal: 5000,
      limit: 10000
    };
  }

  private async checkSanctionsList(senderId: string, receiverId: string): Promise<any> {
    return {
      senderClear: true,
      receiverClear: true,
      watchlistHits: []
    };
  }

  private async checkBehavioralPatterns(senderId: string, transactionType: string): Promise<any> {
    return {
      normalPattern: true,
      anomalyScore: 0.2,
      historicalComparison: 'within_normal_range'
    };
  }

  private async checkGeographicRisk(senderId: string, receiverId: string): Promise<any> {
    return {
      senderCountryRisk: 'low',
      receiverCountryRisk: 'low',
      crossBorderRisk: 'low'
    };
  }

  private calculateOverallRisk(checks: any[]): string {
    // Simple risk calculation logic
    return 'low'; // or 'medium', 'high', 'critical'
  }

  async compensate(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    await eventBus.publish('FraudScreeningCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class RiskAssessmentStep extends SagaStep {
  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    const { transactionId, amount } = context.data;
    
    const riskScore = await this.calculateRiskScore(context.data);
    const riskLevel = this.determineRiskLevel(riskScore);
    
    await eventBus.publish('TransactionRiskAssessed.v1', {
      transactionId,
      riskScore,
      riskLevel,
      sagaId: context.sagaId
    });
  }

  private async calculateRiskScore(data: TransactionMonitoringData): Promise<number> {
    let score = 0;
    
    // Amount-based risk
    if (data.amount > 50000) score += 30;
    else if (data.amount > 10000) score += 15;
    else if (data.amount > 1000) score += 5;
    
    // Transaction type risk
    const highRiskTypes = ['cash_withdrawal', 'international_transfer'];
    if (highRiskTypes.includes(data.transactionType)) score += 20;
    
    // Time-based risk (late night transactions)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 10;
    
    return Math.min(score, 100);
  }

  private determineRiskLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  async compensate(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    await eventBus.publish('TransactionRiskAssessmentCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class ApprovalDecisionStep extends SagaStep {
  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    const { transactionId } = context.data;
    
    const decision = await this.makeApprovalDecision(context.data);
    
    await eventBus.publish('TransactionDecisionMade.v1', {
      transactionId,
      decision,
      sagaId: context.sagaId,
      decidedAt: new Date()
    });

    if (decision === 'block') {
      await this.blockTransaction(transactionId);
    } else if (decision === 'review') {
      await this.queueForManualReview(transactionId);
    }
  }

  private async makeApprovalDecision(data: TransactionMonitoringData): Promise<string> {
    // Mock decision logic based on risk assessment
    if (data.amount > 100000) return 'review';
    if (data.transactionType === 'suspicious_pattern') return 'block';
    return 'approve';
  }

  private async blockTransaction(transactionId: string): Promise<void> {
    await eventBus.publish('TransactionBlocked.v1', {
      transactionId,
      blockedAt: new Date(),
      reason: 'fraud_prevention'
    });
  }

  private async queueForManualReview(transactionId: string): Promise<void> {
    await eventBus.publish('TransactionQueuedForReview.v1', {
      transactionId,
      queuedAt: new Date(),
      priority: 'high'
    });
  }

  async compensate(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    await eventBus.publish('TransactionDecisionReverted.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class NotificationStep extends SagaStep {
  async execute(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    const { transactionId, senderId, receiverId } = context.data;
    
    await eventBus.publish('TransactionMonitoringNotificationSent.v1', {
      transactionId,
      senderId,
      receiverId,
      sagaId: context.sagaId,
      notifiedAt: new Date()
    });
  }

  async compensate(context: SagaContext<TransactionMonitoringData>): Promise<void> {
    // No compensation needed for notifications
  }
}

export class CommissionProcessingSaga extends Saga {
  constructor() {
    super('CommissionProcessing');
  }

  async execute(context: SagaContext<{ transactionId: string; commissionRules: any }>): Promise<void> {
    await this.addStep(new CommissionCalculationStep());
    await this.addStep(new CommissionValidationStep());
    await this.addStep(new CommissionDistributionStep());
    await this.addStep(new CommissionRecordingStep());
  }
}

class CommissionCalculationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { transactionId, commissionRules } = context.data;
    
    const commissions = await this.calculateCommissions(transactionId, commissionRules);
    
    await eventBus.publish('CommissionsCalculated.v1', {
      transactionId,
      commissions,
      sagaId: context.sagaId
    });
  }

  private async calculateCommissions(transactionId: string, rules: any): Promise<any[]> {
    return [
      { recipient: 'platform', amount: 50, percentage: 2.5 },
      { recipient: 'enabler', amount: 20, percentage: 1.0 },
      { recipient: 'referrer', amount: 10, percentage: 0.5 }
    ];
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CommissionCalculationCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class CommissionValidationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { transactionId } = context.data;
    
    await this.validateCommissions(transactionId);
    
    await eventBus.publish('CommissionsValidated.v1', {
      transactionId,
      sagaId: context.sagaId
    });
  }

  private async validateCommissions(transactionId: string): Promise<void> {
    // Validate commission calculations and rules
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CommissionValidationCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class CommissionDistributionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { transactionId } = context.data;
    
    await this.distributeCommissions(transactionId);
    
    await eventBus.publish('CommissionsDistributed.v1', {
      transactionId,
      sagaId: context.sagaId,
      distributedAt: new Date()
    });
  }

  private async distributeCommissions(transactionId: string): Promise<void> {
    // Distribute commissions to respective accounts
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CommissionDistributionReverted.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

class CommissionRecordingStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { transactionId } = context.data;
    
    await eventBus.publish('CommissionsRecorded.v1', {
      transactionId,
      sagaId: context.sagaId,
      recordedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('CommissionRecordingCancelled.v1', {
      transactionId: context.data.transactionId,
      sagaId: context.sagaId
    });
  }
}

export class DisputeResolutionSaga extends Saga {
  constructor() {
    super('DisputeResolution');
  }

  async execute(context: SagaContext<{ disputeId: string; disputeType: string; parties: string[] }>): Promise<void> {
    await this.addStep(new DisputeInitiationStep());
    await this.addStep(new EvidenceCollectionStep());
    await this.addStep(new MediationStep());
    await this.addStep(new ResolutionStep());
    await this.addStep(new EnforcementStep());
  }
}

class DisputeInitiationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { disputeId, disputeType, parties } = context.data;
    
    await eventBus.publish('DisputeInitiated.v1', {
      disputeId,
      disputeType,
      parties,
      sagaId: context.sagaId,
      initiatedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('DisputeInitiationCancelled.v1', {
      disputeId: context.data.disputeId,
      sagaId: context.sagaId
    });
  }
}

class EvidenceCollectionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { disputeId } = context.data;
    
    await eventBus.publish('EvidenceCollectionStarted.v1', {
      disputeId,
      sagaId: context.sagaId
    });

    // Wait for evidence submission from all parties
    await this.waitForEvent('EvidenceCollectionCompleted.v1', { disputeId });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('EvidenceCollectionCancelled.v1', {
      disputeId: context.data.disputeId,
      sagaId: context.sagaId
    });
  }
}

class MediationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { disputeId } = context.data;
    
    await eventBus.publish('MediationStarted.v1', {
      disputeId,
      sagaId: context.sagaId,
      mediator: 'system_mediator'
    });

    // Wait for mediation completion
    await this.waitForEvent('MediationCompleted.v1', { disputeId });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('MediationCancelled.v1', {
      disputeId: context.data.disputeId,
      sagaId: context.sagaId
    });
  }
}

class ResolutionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { disputeId } = context.data;
    
    const resolution = await this.makeResolution(disputeId);
    
    await eventBus.publish('DisputeResolved.v1', {
      disputeId,
      resolution,
      sagaId: context.sagaId,
      resolvedAt: new Date()
    });
  }

  private async makeResolution(disputeId: string): Promise<any> {
    return {
      outcome: 'favor_buyer',
      compensation: 100,
      reasoning: 'Product not as described'
    };
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('DisputeResolutionReverted.v1', {
      disputeId: context.data.disputeId,
      sagaId: context.sagaId
    });
  }
}

class EnforcementStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { disputeId } = context.data;
    
    await this.enforceResolution(disputeId);
    
    await eventBus.publish('DisputeResolutionEnforced.v1', {
      disputeId,
      sagaId: context.sagaId,
      enforcedAt: new Date()
    });
  }

  private async enforceResolution(disputeId: string): Promise<void> {
    // Enforce the resolution (refunds, penalties, etc.)
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('DisputeEnforcementReverted.v1', {
      disputeId: context.data.disputeId,
      sagaId: context.sagaId
    });
  }
}