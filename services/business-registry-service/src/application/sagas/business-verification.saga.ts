import { BusinessVerifiedEvent } from '../../domain/events';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { IMailerAdapter, ICapabilityAdapter } from '../../domain/ports';
import { IBusinessRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure';
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

const DEFAULT_CAPABILITIES = ['catalog', 'orders', 'payments', 'shipping'];

export class BusinessVerificationSaga extends DistributedSagaOrchestrator<BusinessVerificationContext> {
  protected sagaType = 'BusinessVerificationSaga';

  constructor(private readonly deps: BusinessVerificationSagaDeps) {
    super(sagaLogRepository, 'business-registry-service');
  }

  protected async onStart(sagaId: string, payload: BusinessVerificationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting BusinessVerificationSaga for business ${payload.metadata.businessId}`, { sagaId, correlationId });
  }

  protected defineSteps(): SagaStep<BusinessVerificationContext>[] {
    return [
      {
        name: 'NotifyOwner',
        execute: async (context) => {
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
        compensate: async (context) => {
          context.ownerNotified = false;
        }
      },
      {
        name: 'EnableCapabilities',
        execute: async (context) => {
          const ids = await this.deps.capability.enableCapabilities({
            businessId: context.event.aggregateId,
            ownerId: context.event.ownerId,
            capabilities: DEFAULT_CAPABILITIES,
            correlationId: context.metadata.correlationId
          });
          context.capabilityIds = ids;
          context.capabilitiesEnabled = true;
        },
        compensate: async (context) => {
          if (context.capabilitiesEnabled && context.capabilityIds.length > 0) {
            await this.deps.capability.disableCapabilities({
              businessId: context.event.aggregateId,
              capabilityIds: context.capabilityIds,
              correlationId: context.metadata.correlationId
            });
          }
          context.capabilitiesEnabled = false;
          context.capabilityIds = [];
        }
      }
    ];
  }
}

export async function executeBusinessVerificationSaga(
  event: BusinessVerifiedEvent,
  deps: BusinessVerificationSagaDeps
): Promise<void> {
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

  const saga = new BusinessVerificationSaga(deps);
  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error(`BusinessVerificationSaga failed for business ${event.aggregateId}`, { error, correlationId });
    throw error;
  }
}
