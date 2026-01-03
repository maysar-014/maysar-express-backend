import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

export interface UserRegistrationData {
  email: string;
  role: 'ADMIN' | 'SELLER' | 'COURIER' | 'SUPPLIER' | 'ENABLER';
  profile: any;
  permissions?: string[];
}

export class MultiRoleUserRegistrationSaga extends Saga {
  constructor() {
    super('MultiRoleUserRegistration');
  }

  async execute(context: SagaContext<UserRegistrationData>): Promise<void> {
    await this.addStep(new EmailVerificationStep());
    await this.addStep(new RoleAssignmentStep());
    await this.addStep(new PermissionSetupStep());
    await this.addStep(new AccountActivationStep());
  }
}

class EmailVerificationStep extends SagaStep {
  async execute(context: SagaContext<UserRegistrationData>): Promise<void> {
    const { email } = context.data;
    
    await eventBus.publish('EmailVerificationRequested.v1', {
      email,
      sagaId: context.sagaId,
      verificationCode: this.generateVerificationCode()
    });

    await this.waitForEvent('EmailVerified.v1', { email });
  }

  async compensate(context: SagaContext<UserRegistrationData>): Promise<void> {
    await eventBus.publish('EmailVerificationCancelled.v1', {
      email: context.data.email,
      sagaId: context.sagaId
    });
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

class RoleAssignmentStep extends SagaStep {
  async execute(context: SagaContext<UserRegistrationData>): Promise<void> {
    const { email, role } = context.data;

    await eventBus.publish('UserRoleAssigned.v1', {
      email,
      role,
      sagaId: context.sagaId,
      assignedBy: context.metadata.adminId
    });
  }

  async compensate(context: SagaContext<UserRegistrationData>): Promise<void> {
    await eventBus.publish('UserRoleRevoked.v1', {
      email: context.data.email,
      sagaId: context.sagaId
    });
  }
}

class PermissionSetupStep extends SagaStep {
  async execute(context: SagaContext<UserRegistrationData>): Promise<void> {
    const { email, role, permissions } = context.data;
    const defaultPermissions = this.getDefaultPermissions(role);
    const finalPermissions = permissions || defaultPermissions;

    await eventBus.publish('UserPermissionsAssigned.v1', {
      email,
      permissions: finalPermissions,
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<UserRegistrationData>): Promise<void> {
    await eventBus.publish('UserPermissionsRevoked.v1', {
      email: context.data.email,
      sagaId: context.sagaId
    });
  }

  private getDefaultPermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      ADMIN: ['users:read', 'users:write', 'system:admin'],
      SELLER: ['products:write', 'orders:read'],
      COURIER: ['deliveries:read', 'routes:read'],
      SUPPLIER: ['production:write', 'orders:read'],
      ENABLER: ['tasks:read', 'training:deliver']
    };
    return permissionMap[role] || [];
  }
}

class AccountActivationStep extends SagaStep {
  async execute(context: SagaContext<UserRegistrationData>): Promise<void> {
    const { email, role, profile } = context.data;

    await eventBus.publish('UserAccountActivated.v1', {
      email,
      role,
      profile,
      sagaId: context.sagaId,
      activatedAt: new Date()
    });
  }

  async compensate(context: SagaContext<UserRegistrationData>): Promise<void> {
    await eventBus.publish('UserAccountDeactivated.v1', {
      email: context.data.email,
      sagaId: context.sagaId
    });
  }
}

export class BulkUserOperationsSaga extends Saga {
  constructor() {
    super('BulkUserOperations');
  }

  async execute(context: SagaContext<{ userIds: string[]; operation: string; data: any }>): Promise<void> {
    await this.addStep(new BulkOperationValidationStep());
    await this.addStep(new BulkOperationExecutionStep());
    await this.addStep(new BulkOperationNotificationStep());
  }
}

class BulkOperationValidationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userIds, operation } = context.data;
    
    await eventBus.publish('BulkOperationValidationStarted.v1', {
      userIds,
      operation,
      sagaId: context.sagaId
    });

    for (const userId of userIds) {
      await this.validateUser(userId, operation);
    }
  }

  private async validateUser(userId: string, operation: string): Promise<void> {
    const validOperations = ['suspend', 'activate', 'delete', 'update_role'];
    if (!validOperations.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`);
    }
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('BulkOperationValidationCancelled.v1', {
      sagaId: context.sagaId
    });
  }
}

class BulkOperationExecutionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userIds, operation, data } = context.data;
    
    for (const userId of userIds) {
      await eventBus.publish('UserBulkOperationExecuted.v1', {
        userId,
        operation,
        data,
        sagaId: context.sagaId
      });
    }
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    const { userIds, operation } = context.data;
    const reverseOperation = this.getReverseOperation(operation);
    
    for (const userId of userIds) {
      await eventBus.publish('UserBulkOperationReverted.v1', {
        userId,
        operation: reverseOperation,
        sagaId: context.sagaId
      });
    }
  }

  private getReverseOperation(operation: string): string {
    const reverseMap: Record<string, string> = {
      'suspend': 'activate',
      'activate': 'suspend',
      'delete': 'restore'
    };
    return reverseMap[operation] || 'revert';
  }
}

class BulkOperationNotificationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userIds, operation } = context.data;
    
    await eventBus.publish('BulkOperationCompleted.v1', {
      userCount: userIds.length,
      operation,
      sagaId: context.sagaId,
      completedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    // No compensation needed for notifications
  }
}

export class UserSuspensionSaga extends Saga {
  constructor() {
    super('UserSuspension');
  }

  async execute(context: SagaContext<{ userId: string; reason: string; duration?: number }>): Promise<void> {
    await this.addStep(new SuspensionValidationStep());
    await this.addStep(new AccountSuspensionStep());
    await this.addStep(new SuspensionNotificationStep());
  }
}

class SuspensionValidationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userId, reason } = context.data;
    
    await eventBus.publish('UserSuspensionValidationStarted.v1', {
      userId,
      reason,
      sagaId: context.sagaId
    });

    await this.validateSuspension(userId, reason);
  }

  private async validateSuspension(userId: string, reason: string): Promise<void> {
    const validReasons = ['policy_violation', 'fraud_suspicion', 'security_breach', 'admin_request'];
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid suspension reason: ${reason}`);
    }
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('UserSuspensionValidationCancelled.v1', {
      userId: context.data.userId,
      sagaId: context.sagaId
    });
  }
}

class AccountSuspensionStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userId, reason, duration } = context.data;
    
    await eventBus.publish('UserAccountSuspended.v1', {
      userId,
      reason,
      duration,
      suspendedAt: new Date(),
      sagaId: context.sagaId
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    await eventBus.publish('UserAccountReactivated.v1', {
      userId: context.data.userId,
      reason: 'saga_compensation',
      sagaId: context.sagaId
    });
  }
}

class SuspensionNotificationStep extends SagaStep {
  async execute(context: SagaContext<any>): Promise<void> {
    const { userId, reason } = context.data;
    
    await eventBus.publish('UserSuspensionNotificationSent.v1', {
      userId,
      reason,
      sagaId: context.sagaId,
      notifiedAt: new Date()
    });
  }

  async compensate(context: SagaContext<any>): Promise<void> {
    // No compensation needed for notifications
  }
}