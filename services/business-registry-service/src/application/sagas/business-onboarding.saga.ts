import { BusinessRegisteredEvent } from '../../domain/events';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { logger } from '../../infrastructure';
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

export class BusinessOnboardingSaga extends DistributedSagaOrchestrator<BusinessOnboardingContext> {
  protected sagaType = 'BusinessOnboardingSaga';

  constructor() {
    super(sagaLogRepository, 'business-registry-service');
  }

  protected async onStart(sagaId: string, payload: BusinessOnboardingContext, correlationId?: string): Promise<void> {
    logger.info(`Starting BusinessOnboardingSaga for business ${payload.metadata.businessId}`, { sagaId, correlationId });
  }

  protected defineSteps(): SagaStep<BusinessOnboardingContext>[] {
    return [
      {
        name: 'NotifyUserService',
        execute: async (context) => {
          // Logic to notify user service
          context.userServiceNotified = true;
        },
        compensate: async (context) => {
          context.userServiceNotified = false;
        }
      },
      {
        name: 'ConfigureCapabilities',
        execute: async (context) => {
          // Logic to configure capabilities
          context.capabilitiesConfigured = true;
        },
        compensate: async (context) => {
          context.capabilitiesConfigured = false;
        }
      },
      {
        name: 'SetupComplianceTracking',
        execute: async (context) => {
          // Logic to setup compliance tracking
          context.complianceTrackingSetup = true;
        },
        compensate: async (context) => {
          context.complianceTrackingSetup = false;
        }
      }
    ];
  }
}

export async function executeBusinessOnboardingSaga(event: BusinessRegisteredEvent): Promise<void> {
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

  const saga = new BusinessOnboardingSaga();
  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error(`BusinessOnboardingSaga failed for business ${event.aggregateId}`, { error, correlationId });
    throw error;
  }
}
