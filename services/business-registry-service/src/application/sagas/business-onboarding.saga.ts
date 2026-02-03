import { BusinessRegisteredEvent } from '../../domain/events';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessOnboardingContext {
  event: BusinessRegisteredEvent;
  userServiceNotified: boolean;
  capabilitiesConfigured: boolean;
  complianceTrackingSetup: boolean;
  metadata: {
    correlationId: string;
    businessId: string;
    ownerId: string;
    timestamp: Date;
  };
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

export class BusinessOnboardingSaga extends BaseSaga<BusinessOnboardingContext> {
  constructor(event: BusinessRegisteredEvent) {
    const correlationId = (event.metadata?.correlationId as string) || uuidv4();
    const context: BusinessOnboardingContext = {
      event,
      userServiceNotified: false,
      capabilitiesConfigured: false,
      complianceTrackingSetup: false,
      metadata: {
        correlationId,
        businessId: event.aggregateId,
        ownerId: event.ownerId,
        timestamp: new Date()
      }
    };

    super(`business-onboarding-${correlationId}`, context);
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.addStep(this.createNotifyUserServiceStep());
    this.addStep(this.createConfigureCapabilitiesStep());
    this.addStep(this.createComplianceTrackingStep());
  }

  private createNotifyUserServiceStep(): SagaStep<BusinessOnboardingContext> {
    return {
      name: 'NotifyUserService',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.userServiceNotified = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'notify_user_service', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.userServiceNotified) return;
        await this.withRetry(
          async () => {
            context.userServiceNotified = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_user_service', context: context.metadata }
        );
      },
      options: { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000 }
    };
  }

  private createConfigureCapabilitiesStep(): SagaStep<BusinessOnboardingContext> {
    return {
      name: 'ConfigureCapabilities',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.capabilitiesConfigured = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'configure_capabilities', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.capabilitiesConfigured) return;
        await this.withRetry(
          async () => {
            context.capabilitiesConfigured = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_capabilities', context: context.metadata }
        );
      },
      options: { maxRetries: 2, retryDelayMs: 500, timeoutMs: 10000 }
    };
  }

  private createComplianceTrackingStep(): SagaStep<BusinessOnboardingContext> {
    return {
      name: 'SetupComplianceTracking',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.complianceTrackingSetup = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'setup_compliance_tracking', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.complianceTrackingSetup) return;
        await this.withRetry(
          async () => {
            context.complianceTrackingSetup = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_compliance_tracking', context: context.metadata }
        );
      },
      options: { maxRetries: 2, retryDelayMs: 500, timeoutMs: 10000 }
    };
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxRetries: number; retryDelayMs: number; operation: string; context: Record<string, unknown> }
  ): Promise<T> {
    const { maxRetries, retryDelayMs, operation: opName, context } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === maxRetries) break;
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new SagaError(`Operation '${opName}' failed after ${maxRetries} attempts`, {
      ...context,
      lastError: lastError?.message
    });
  }
}

export async function executeBusinessOnboardingSaga(event: BusinessRegisteredEvent): Promise<void> {
  const saga = new BusinessOnboardingSaga(event);
  await saga.execute();
}
