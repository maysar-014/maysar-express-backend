import { Saga, SagaStep, SagaContext } from '@shared/sagaFramework';

/**
 * Step to send notification when 2FA is enabled
 */
class SendEnabledNotificationStep extends SagaStep {
    async execute(context: SagaContext<{ userId: string }>): Promise<void> {
        // In a real app, this would publish a 'NotificationRequired' event
        console.log(`[Saga] Sending 2FA enabled notification for user: ${context.data.userId}`);
    }
    async compensate(context: SagaContext<{ userId: string }>): Promise<void> {
        console.log(`[Saga] Compensation: Undoing notification state for user: ${context.data.userId}`);
    }
}

/**
 * Step to record audit log for 2FA changes
 */
class RecordAuditLogStep extends SagaStep {
    async execute(context: SagaContext<{ userId: string; action: string }>): Promise<void> {
        console.log(`[Saga] Recording audit log for user: ${context.data.userId}, action: ${context.data.action}`);
    }
    async compensate(context: SagaContext<{ userId: string }>): Promise<void> {
        // Compensation usually not needed for audit logs unless delete is required
    }
}

/**
 * Orchestrates the lifecycle transitions of 2FA (Enable, Disable, etc.)
 */
export class TwoFactorLifecycleSaga extends Saga {
    constructor() {
        super();
        this.addStep(new SendEnabledNotificationStep());
        this.addStep(new RecordAuditLogStep());
    }

    /**
     * Initial execution logic for the Saga
     */
    async execute(context: SagaContext): Promise<void> {
        console.log(`[Saga] Starting TwoFactorLifecycleSaga for ID: ${context.sagaId}`);
    }

    /**
     * Helper to start the saga for 'Enabled' event
     */
    public async handleEnabled(userId: string): Promise<string> {
        return await this.start({ userId, action: '2FA_ENABLED' });
    }

    /**
     * Helper to start the saga for 'Disabled' event
     */
    public async handleDisabled(userId: string): Promise<string> {
        return await this.start({ userId, action: '2FA_DISABLED' });
    }
}
