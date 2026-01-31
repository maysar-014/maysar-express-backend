import { BusinessVerifiedEvent } from '../../domain/events';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessVerificationContext {
  event: BusinessVerifiedEvent;
  ownerNotified: boolean;
  capabilitiesEnabled: boolean;
  metadata: {
    correlationId: string;
    businessId: string;
    timestamp: Date;
  };
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

export class BusinessVerificationSaga extends BaseSaga<BusinessVerificationContext> {
  constructor(event: BusinessVerifiedEvent) {
    const correlationId = (event.metadata?.correlationId as string) || uuidv4();
    const context: BusinessVerificationContext = {
      event,
      ownerNotified: false,
      capabilitiesEnabled: false,
      metadata: {
        correlationId,
        businessId: event.aggregateId,
        timestamp: new Date()
      }
    };

    super(`business-verification-${correlationId}`, context);
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.addStep(this.createNotifyOwnerStep());
    this.addStep(this.createEnableCapabilitiesStep());
  }

  private createNotifyOwnerStep(): SagaStep<BusinessVerificationContext> {
    return {
      name: 'NotifyOwner',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.ownerNotified = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'notify_owner', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.ownerNotified) return;
        await this.withRetry(
          async () => {
            context.ownerNotified = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_notify_owner', context: context.metadata }
        );
      },
      options: { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000 }
    };
  }

  private createEnableCapabilitiesStep(): SagaStep<BusinessVerificationContext> {
    return {
      name: 'EnableCapabilities',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.capabilitiesEnabled = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'enable_capabilities', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.capabilitiesEnabled) return;
        await this.withRetry(
          async () => {
            context.capabilitiesEnabled = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_capabilities', context: context.metadata }
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

export async function executeBusinessVerificationSaga(event: BusinessVerifiedEvent): Promise<void> {
  const saga = new BusinessVerificationSaga(event);
  await saga.execute();
}
