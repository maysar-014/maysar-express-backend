import { BusinessRegisteredEvent } from '../../domain/events';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { IMailerAdapter, IComplianceAdapter } from '../../domain/ports';
import { IBusinessRepository } from '../../domain/repositories';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessRegistrationContext {
  event: BusinessRegisteredEvent;
  emailSent: boolean;
  complianceNotified: boolean;
  complianceRecordCreated: boolean;
  complianceRecordId?: string;
  metadata: {
    correlationId: string;
    businessId: string;
    timestamp: Date;
  };
}

export interface BusinessRegistrationSagaDeps {
  mailer: IMailerAdapter;
  compliance: IComplianceAdapter;
  businessRepository: IBusinessRepository;
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

export class BusinessRegistrationSaga extends BaseSaga<BusinessRegistrationContext> {
  constructor(
    event: BusinessRegisteredEvent,
    private readonly deps: BusinessRegistrationSagaDeps
  ) {
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
            const business = await this.deps.businessRepository.findById(context.event.aggregateId);
            const email = business?.email ?? undefined;
            if (email) {
              await this.deps.mailer.sendVerificationEmail({
                to: email,
                businessName: business!.name,
                businessId: context.event.aggregateId,
                verificationLink: `${process.env.APP_URL || 'http://localhost:3000'}/business/${context.event.aggregateId}/verify`
              });
            }
            context.emailSent = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'send_verification_email', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.emailSent) return;
        // Cannot unsend email - log compensation and mark as reverted for saga state
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
            await this.deps.compliance.notifyNewBusiness({
              businessId: context.event.aggregateId,
              ownerId: context.event.ownerId,
              businessType: context.event.businessType,
              registrationNumber: context.event.registrationNumber,
              correlationId: context.metadata.correlationId
            });
            context.complianceNotified = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'notify_compliance', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.complianceNotified) return;
        // Compliance notification cannot be fully revoked - log for audit
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
            const recordId = await this.deps.compliance.createComplianceRecord({
              businessId: context.event.aggregateId,
              complianceType: 'local_regulatory',
              status: 'UNDER_REVIEW',
              correlationId: context.metadata.correlationId
            });
            context.complianceRecordId = recordId;
            context.complianceRecordCreated = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'create_compliance_record', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.complianceRecordCreated || !context.complianceRecordId) return;
        await this.withRetry(
          async () => {
            await this.deps.compliance.revokeComplianceRecord(
              context.complianceRecordId!,
              context.metadata.correlationId
            );
            context.complianceRecordCreated = false;
            context.complianceRecordId = undefined;
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

export async function executeBusinessRegistrationSaga(
  event: BusinessRegisteredEvent,
  deps: BusinessRegistrationSagaDeps
): Promise<void> {
  const saga = new BusinessRegistrationSaga(event, deps);
  await saga.execute();
}
