import { BusinessRegisteredEvent } from '../../domain/events';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessRegistrationContext {
  event: BusinessRegisteredEvent;
  emailSent: boolean;
  complianceNotified: boolean;
  complianceRecordCreated: boolean;
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

export class BusinessRegistrationSaga extends BaseSaga<BusinessRegistrationContext> {
  constructor(event: BusinessRegisteredEvent) {
    const correlationId = (event.metadata?.correlationId as string) || uuidv4();
    const context: BusinessRegistrationContext = {
      event,
      emailSent: false,
      complianceNotified: false,
      complianceRecordCreated: false,
      metadata: {
        correlationId,
        businessId: event.aggregateId,
        timestamp: new Date()
      }
    };

    super(`business-registration-${correlationId}`, context);
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.addStep(this.createVerificationEmailStep());
    this.addStep(this.createNotifyComplianceStep());
    this.addStep(this.createComplianceRecordStep());
  }

  private createVerificationEmailStep(): SagaStep<BusinessRegistrationContext> {
    return {
      name: 'SendVerificationEmail',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.emailSent = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'send_verification_email', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.emailSent) return;
        await this.withRetry(
          async () => {
            context.emailSent = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_verification_email', context: context.metadata }
        );
      },
      options: { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 15000 }
    };
  }

  private createNotifyComplianceStep(): SagaStep<BusinessRegistrationContext> {
    return {
      name: 'NotifyComplianceService',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.complianceNotified = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'notify_compliance', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.complianceNotified) return;
        await this.withRetry(
          async () => {
            context.complianceNotified = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_compliance_notify', context: context.metadata }
        );
      },
      options: { maxRetries: 2, retryDelayMs: 500, timeoutMs: 10000 }
    };
  }

  private createComplianceRecordStep(): SagaStep<BusinessRegistrationContext> {
    return {
      name: 'CreateComplianceRecord',
      execute: async (context) => {
        await this.withRetry(
          async () => {
            context.complianceRecordCreated = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'create_compliance_record', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.complianceRecordCreated) return;
        await this.withRetry(
          async () => {
            context.complianceRecordCreated = false;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'compensate_compliance_record', context: context.metadata }
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

export async function executeBusinessRegistrationSaga(event: BusinessRegisteredEvent): Promise<void> {
  const saga = new BusinessRegistrationSaga(event);
  await saga.execute();
}
