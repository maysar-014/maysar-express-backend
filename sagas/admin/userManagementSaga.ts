import { BaseSaga, SagaStep } from '../BaseSaga';
import { EventBus } from '../../events/EventBus';

export interface UserManagementSagaData {
  userId: string;
  adminId: string;
  action: 'CREATE' | 'UPDATE' | 'SUSPEND' | 'ACTIVATE' | 'DELETE';
  userData?: any;
  reason?: string;
}

export class UserManagementSaga extends BaseSaga<UserManagementSagaData> {
  protected steps: SagaStep<UserManagementSagaData>[] = [
    {
      name: 'VALIDATE_ADMIN_PERMISSIONS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'AdminPermissionValidationRequested',
          payload: { adminId: data.adminId, action: data.action, targetUserId: data.userId },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'AdminPermissionValidationCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'EXECUTE_USER_ACTION',
      execute: async (data) => {
        const eventType = this.getEventTypeForAction(data.action);
        await EventBus.publish({
          type: eventType,
          payload: { 
            userId: data.userId, 
            adminId: data.adminId, 
            userData: data.userData,
            reason: data.reason 
          },
          correlationId: this.correlationId
        });
      },
      compensate: async (data) => {
        const compensationEvent = this.getCompensationEventForAction(data.action);
        await EventBus.publish({
          type: compensationEvent,
          payload: { userId: data.userId, adminId: data.adminId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'LOG_ADMIN_ACTION',
      execute: async (data) => {
        await EventBus.publish({
          type: 'AdminActionLogged',
          payload: {
            adminId: data.adminId,
            action: `USER_${data.action}`,
            targetId: data.userId,
            timestamp: new Date().toISOString(),
            details: { userData: data.userData, reason: data.reason }
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'AdminActionLogCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    },
    {
      name: 'NOTIFY_STAKEHOLDERS',
      execute: async (data) => {
        await EventBus.publish({
          type: 'UserManagementNotificationRequested',
          payload: {
            userId: data.userId,
            adminId: data.adminId,
            action: data.action,
            notificationChannels: ['email', 'push']
          },
          correlationId: this.correlationId
        });
      },
      compensate: async () => {
        await EventBus.publish({
          type: 'UserManagementNotificationCancelled',
          payload: { correlationId: this.correlationId },
          correlationId: this.correlationId
        });
      }
    }
  ];

  private getEventTypeForAction(action: string): string {
    const eventMap = {
      'CREATE': 'UserCreationRequested',
      'UPDATE': 'UserUpdateRequested',
      'SUSPEND': 'UserSuspensionRequested',
      'ACTIVATE': 'UserActivationRequested',
      'DELETE': 'UserDeletionRequested'
    };
    return eventMap[action] || 'UserActionRequested';
  }

  private getCompensationEventForAction(action: string): string {
    const compensationMap = {
      'CREATE': 'UserCreationCancelled',
      'UPDATE': 'UserUpdateReverted',
      'SUSPEND': 'UserSuspensionReverted',
      'ACTIVATE': 'UserActivationReverted',
      'DELETE': 'UserDeletionCancelled'
    };
    return compensationMap[action] || 'UserActionCancelled';
  }
}