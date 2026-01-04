import { BaseSaga, SagaStep } from '../BaseSaga';
import { EventBus } from '../../events/EventBus';

export interface DisputeResolutionSagaData {
  disputeId: string;
  adminId: string;
  action: 'INVESTIGATE' | 'MEDIATE' | 'RESOLVE_BUYER' | 'RESOLVE_SELLER' | 'ESCALATE';
  resolution?: string;
  refundAmount?: number;
  compensationAmount?: number;
  escalationReason?: string;
}

export class DisputeResolutionSaga extends BaseSaga<DisputeResolutionSagaData> {
  protected steps: SagaStep<DisputeResolutionSagaData>[] = [
    {
      name: 'GATHER_DISPUTE_EVIDENCE',
      execute: async (data) => {
        await EventBus.publish({
          type: 'DisputeEvidenceGatheringRequested',
          payload: {
            disputeId: data.disputeId,
            adminId: data.adminId,
            includeOrderHistory: true,
            includePaymentHistory: true,
            includeCommunicationHistory: true
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'DisputeEvidenceGatheringCancelled',
          payload: { disputeId: this.data.disputeId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'ANALYZE_DISPUTE_MERITS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'DisputeAnalysisRequested',
          payload: {
            disputeId: data.disputeId,
            analysisType: 'COMPREHENSIVE',
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'DisputeAnalysisCancelled',
          payload: { disputeId: this.data.disputeId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'EXECUTE_DISPUTE_ACTION',
      execute: async (data) => {
        const eventType = this.getDisputeEventType(data.action);
        await EventBus.publish({
          type: eventType,
          payload: {
            disputeId: data.disputeId,
            adminId: data.adminId,
            action: data.action,
            resolution: data.resolution,
            refundAmount: data.refundAmount,
            compensationAmount: data.compensationAmount,
            escalationReason: data.escalationReason
          },
          correlationId: this.correlationId
        });
      },
      compensate: async (data) => {
        const compensationEvent = this.getDisputeCompensationEvent(data.action);
        await EventBus.publish({
          type: compensationEvent,
          payload: {
            disputeId: data.disputeId,
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'PROCESS_FINANCIAL_ADJUSTMENTS',
      execute: async (data) => {
        if (data.refundAmount || data.compensationAmount) {
          await EventBus.publish({
            type: 'DisputeFinancialAdjustmentRequested',
            payload: {
              disputeId: data.disputeId,
              refundAmount: data.refundAmount,
              compensationAmount: data.compensationAmount,
              adminId: data.adminId
            },
            correlationId: this.correlationId
          });
        }
      },
      compensate: async (data) => {
        if (data.refundAmount || data.compensationAmount) {
          await EventBus.publish({
            type: 'DisputeFinancialAdjustmentReverted',
            payload: {
              disputeId: data.disputeId,
              adminId: data.adminId
            },
            correlationId: this.correlationId
          });
        }
      }
    },
    {
      name: 'UPDATE_TRUST_SCORES',
      execute: async (data) => {
        if (data.action.startsWith('RESOLVE_')) {
          await EventBus.publish({
            type: 'TrustScoreUpdateRequested',
            payload: {
              disputeId: data.disputeId,
              resolution: data.action,
              adminId: data.adminId
            },
            correlationId: this.correlationId
          });
        }
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'TrustScoreUpdateReverted',
          payload: { disputeId: this.data.disputeId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'NOTIFY_DISPUTE_PARTIES',
      execute: async (data) => {
        await EventBus.publish({
          type: 'DisputeResolutionNotificationRequested',
          payload: {
            disputeId: data.disputeId,
            action: data.action,
            resolution: data.resolution,
            refundAmount: data.refundAmount,
            compensationAmount: data.compensationAmount,
            adminId: data.adminId,
            notificationChannels: ['email', 'push']
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'DisputeResolutionNotificationCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'LOG_DISPUTE_RESOLUTION',
      execute: async (data) => {
        await EventBus.publish({
          type: 'DisputeResolutionLogged',
          payload: {
            disputeId: data.disputeId,
            adminId: data.adminId,
            action: data.action,
            timestamp: new Date().toISOString(),
            details: {
              resolution: data.resolution,
              refundAmount: data.refundAmount,
              compensationAmount: data.compensationAmount,
              escalationReason: data.escalationReason
            }
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'DisputeResolutionLogCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    }
  ];

  private getDisputeEventType(action: string): string {
    const eventMap = {
      'INVESTIGATE': 'DisputeInvestigationStarted',
      'MEDIATE': 'DisputeMediationStarted',
      'RESOLVE_BUYER': 'DisputeResolvedInFavorOfBuyer',
      'RESOLVE_SELLER': 'DisputeResolvedInFavorOfSeller',
      'ESCALATE': 'DisputeEscalated'
    };
    return eventMap[action] || 'DisputeActionRequested';
  }

  private getDisputeCompensationEvent(action: string): string {
    const compensationMap = {
      'INVESTIGATE': 'DisputeInvestigationCancelled',
      'MEDIATE': 'DisputeMediationCancelled',
      'RESOLVE_BUYER': 'DisputeResolutionReverted',
      'RESOLVE_SELLER': 'DisputeResolutionReverted',
      'ESCALATE': 'DisputeEscalationReverted'
    };
    return compensationMap[action] || 'DisputeActionCancelled';
  }
}