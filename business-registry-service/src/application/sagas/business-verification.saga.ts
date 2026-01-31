import { BusinessVerifiedEvent } from '../../domain/events';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
import { IMailerAdapter, ICapabilityAdapter } from '../../domain/ports';
import { IBusinessRepository } from '../../domain/repositories';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessVerificationContext {
  event: BusinessVerifiedEvent;
  ownerNotified: boolean;
  capabilitiesEnabled: boolean;
  capabilityIds: string[];
  metadata: {
    correlationId: string;
    businessId: string;
    timestamp: Date;
  };
}

export interface BusinessVerificationSagaDeps {
  mailer: IMailerAdapter;
  capability: ICapabilityAdapter;
  businessRepository: IBusinessRepository;
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000
};

const DEFAULT_CAPABILITIES = ['catalog', 'orders', 'payments', 'shipping'];

export class BusinessVerificationSaga extends BaseSaga<BusinessVerificationContext> {
  constructor(
    event: BusinessVerifiedEvent,
    private readonly deps: BusinessVerificationSagaDeps
  ) {
    const correlationId = (event.metadata?.correlationId as string) || uuidv4();
    const context: BusinessVerificationContext = {
      event,
      ownerNotified: false,
      capabilitiesEnabled: false,
      capabilityIds: [],
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
            const business = await this.deps.businessRepository.findById(context.event.aggregateId);
            const email = business?.email ?? undefined;
            if (email) {
              await this.deps.mailer.sendBusinessVerifiedEmail({
                to: email,
                businessName: business!.name,
                businessId: context.event.aggregateId
              });
            }
            context.ownerNotified = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'notify_owner', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.ownerNotified) return;
        // Cannot unsend email - log compensation
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
            const ids = await this.deps.capability.enableCapabilities({
              businessId: context.event.aggregateId,
              ownerId: context.event.ownerId,
              capabilities: DEFAULT_CAPABILITIES,
              correlationId: context.metadata.correlationId
            });
            context.capabilityIds = ids;
            context.capabilitiesEnabled = true;
          },
          { ...DEFAULT_RETRY_OPTIONS, operation: 'enable_capabilities', context: context.metadata }
        );
      },
      compensate: async (context) => {
        if (!context.capabilitiesEnabled || context.capabilityIds.length === 0) return;
        await this.withRetry(
          async () => {
            await this.deps.capability.disableCapabilities({
              businessId: context.event.aggregateId,
              capabilityIds: context.capabilityIds,
              correlationId: context.metadata.correlationId
            });
            context.capabilitiesEnabled = false;
            context.capabilityIds = [];
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

export async function executeBusinessVerificationSaga(
  event: BusinessVerifiedEvent,
  deps: BusinessVerificationSagaDeps
): Promise<void> {
  const saga = new BusinessVerificationSaga(event, deps);
  await saga.execute();
}
