import { BaseSaga, SagaStep } from '../BaseSaga';
import { EventBus } from '../../events/EventBus';

export interface TransactionMonitoringSagaData {
  transactionId: string;
  adminId: string;
  action: 'INVESTIGATE' | 'FLAG_SUSPICIOUS' | 'APPROVE' | 'BLOCK' | 'REFUND';
  reason?: string;
  flagType?: 'FRAUD' | 'COMPLIANCE' | 'MANUAL_REVIEW';
  refundAmount?: number;
}

export class TransactionMonitoringSaga extends BaseSaga<TransactionMonitoringSagaData> {
  protected steps: SagaStep<TransactionMonitoringSagaData>[] = [
    {
      name: 'FETCH_TRANSACTION_DETAILS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'TransactionDetailsRequested',
          payload: {
            transactionId: data.transactionId,
            adminId: data.adminId,
            includeRelatedTransactions: true
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'TransactionDetailsCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'PERFORM_FRAUD_ANALYSIS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'FraudAnalysisRequested',
          payload: {
            transactionId: data.transactionId,
            analysisType: 'COMPREHENSIVE',
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'FraudAnalysisCancelled',
          payload: { transactionId: this.data.transactionId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'EXECUTE_TRANSACTION_ACTION',
      execute: async (data) => {
        const eventType = this.getTransactionEventType(data.action);
        await EventBus.publish({
          type: eventType,
          payload: {
            transactionId: data.transactionId,
            adminId: data.adminId,
            action: data.action,
            reason: data.reason,
            flagType: data.flagType,
            refundAmount: data.refundAmount
          },
          correlationId: this.correlationId
        });
      },
      compensate: async (data) => {
        const compensationEvent = this.getTransactionCompensationEvent(data.action);
        await EventBus.publish({
          type: compensationEvent,
          payload: {
            transactionId: data.transactionId,
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'UPDATE_RISK_PROFILE',
      execute: async (data) => {
        if (data.action === 'FLAG_SUSPICIOUS' || data.action === 'BLOCK') {
          await EventBus.publish({
            type: 'UserRiskProfileUpdated',
            payload: {
              transactionId: data.transactionId,
              riskLevel: data.action === 'BLOCK' ? 'HIGH' : 'MEDIUM',
              flagType: data.flagType,
              adminId: data.adminId
            },
            correlationId: this.correlationId
          });
        }
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'UserRiskProfileReverted',
          payload: { transactionId: this.data.transactionId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'NOTIFY_AFFECTED_PARTIES',
      execute: async (data) => {
        await EventBus.publish({
          type: 'TransactionActionNotificationRequested',
          payload: {
            transactionId: data.transactionId,
            action: data.action,
            reason: data.reason,
            adminId: data.adminId,
            notificationChannels: ['email', 'push']
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'TransactionActionNotificationCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'LOG_COMPLIANCE_AUDIT',
      execute: async (data) => {
        await EventBus.publish({
          type: 'ComplianceAuditLogged',
          payload: {
            transactionId: data.transactionId,
            adminId: data.adminId,
            action: data.action,
            auditType: 'TRANSACTION_MONITORING',
            timestamp: new Date().toISOString(),
            details: {
              reason: data.reason,
              flagType: data.flagType,
              refundAmount: data.refundAmount
            }
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'ComplianceAuditCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    }
  ];

  private getTransactionEventType(action: string): string {
    const eventMap = {
      'INVESTIGATE': 'TransactionInvestigationStarted',
      'FLAG_SUSPICIOUS': 'TransactionFlaggedSuspicious',
      'APPROVE': 'TransactionApproved',
      'BLOCK': 'TransactionBlocked',
      'REFUND': 'TransactionRefundRequested'
    };
    return eventMap[action] || 'TransactionActionRequested';
  }

  private getTransactionCompensationEvent(action: string): string {
    const compensationMap = {
      'INVESTIGATE': 'TransactionInvestigationCancelled',
      'FLAG_SUSPICIOUS': 'TransactionFlagReverted',
      'APPROVE': 'TransactionApprovalReverted',
      'BLOCK': 'TransactionBlockReverted',
      'REFUND': 'TransactionRefundCancelled'
    };
    return compensationMap[action] || 'TransactionActionCancelled';
  }
}