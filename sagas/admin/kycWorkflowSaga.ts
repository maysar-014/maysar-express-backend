import { BaseSaga, SagaStep } from '../BaseSaga';
import { EventBus } from '../../events/EventBus';

export interface KYCWorkflowSagaData {
  kycId: string;
  userId: string;
  adminId: string;
  action: 'REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_ADDITIONAL';
  documents?: string[];
  rejectionReason?: string;
  additionalRequirements?: string[];
}

export class KYCWorkflowSaga extends BaseSaga<KYCWorkflowSagaData> {
  protected steps: SagaStep<KYCWorkflowSagaData>[] = [
    {
      name: 'VALIDATE_KYC_DOCUMENTS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'KYCDocumentValidationRequested',
          payload: {
            kycId: data.kycId,
            userId: data.userId,
            documents: data.documents,
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'KYCDocumentValidationCancelled',
          payload: { kycId: this.data.kycId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'PERFORM_COMPLIANCE_CHECK',
      execute: async (data) => {
        await EventBus.publish({
          type: 'ComplianceCheckRequested',
          payload: {
            kycId: data.kycId,
            userId: data.userId,
            checkType: 'KYC_VERIFICATION',
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'ComplianceCheckCancelled',
          payload: { kycId: this.data.kycId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'EXECUTE_KYC_DECISION',
      execute: async (data) => {
        const eventType = this.getKYCEventType(data.action);
        await EventBus.publish({
          type: eventType,
          payload: {
            kycId: data.kycId,
            userId: data.userId,
            adminId: data.adminId,
            decision: data.action,
            rejectionReason: data.rejectionReason,
            additionalRequirements: data.additionalRequirements
          },
          correlationId: this.correlationId
        });
      },
      compensate: async (data) => {
        await EventBus.publish({
          type: 'KYCDecisionReverted',
          payload: {
            kycId: data.kycId,
            userId: data.userId,
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'UPDATE_USER_STATUS',
      execute: async (data) => {
        if (data.action === 'APPROVE') {
          await EventBus.publish({
            type: 'UserKYCStatusUpdated',
            payload: {
              userId: data.userId,
              kycStatus: 'APPROVED',
              adminId: data.adminId
            },
            correlationId: this.correlationId
          });
        }
      },
      compensate: async (data) => {
        await EventBus.publish({
          type: 'UserKYCStatusReverted',
          payload: {
            userId: data.userId,
            adminId: data.adminId
          },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'NOTIFY_USER_KYC_RESULT',
      execute: async (data) => {
        await EventBus.publish({
          type: 'KYCResultNotificationRequested',
          payload: {
            userId: data.userId,
            kycId: data.kycId,
            decision: data.action,
            rejectionReason: data.rejectionReason,
            additionalRequirements: data.additionalRequirements,
            notificationChannels: ['email', 'push']
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'KYCResultNotificationCancelled',
          payload: { kycId: this.data.kycId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'LOG_KYC_AUDIT_TRAIL',
      execute: async (data) => {
        await EventBus.publish({
          type: 'KYCAuditTrailLogged',
          payload: {
            kycId: data.kycId,
            userId: data.userId,
            adminId: data.adminId,
            action: data.action,
            timestamp: new Date().toISOString(),
            details: {
              rejectionReason: data.rejectionReason,
              additionalRequirements: data.additionalRequirements
            }
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'KYCAuditTrailCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    }
  ];

  private getKYCEventType(action: string): string {
    const eventMap = {
      'REVIEW': 'KYCReviewStarted',
      'APPROVE': 'KYCApproved',
      'REJECT': 'KYCRejected',
      'REQUEST_ADDITIONAL': 'KYCAdditionalDocumentsRequested'
    };
    return eventMap[action] || 'KYCActionRequested';
  }
}