import { BusinessRegisteredEvent } from '../../domain/events';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { IMailerAdapter, IComplianceAdapter } from '../../domain/ports';
import { IBusinessRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure';
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

export class BusinessRegistrationSaga extends DistributedSagaOrchestrator<BusinessRegistrationContext> {
  protected sagaType = 'BusinessRegistrationSaga';

  constructor(private readonly deps: BusinessRegistrationSagaDeps) {
    super(sagaLogRepository, 'business-registry-service');
  }

  protected async onStart(sagaId: string, payload: BusinessRegistrationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting BusinessRegistrationSaga for business ${payload.metadata.businessId}`, { sagaId, correlationId });
  }

  protected defineSteps(): SagaStep<BusinessRegistrationContext>[] {
    return [
      {
        name: 'SendVerificationEmail',
        execute: async (context) => {
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
        compensate: async (context) => {
          context.emailSent = false;
        }
      },
      {
        name: 'NotifyComplianceService',
        execute: async (context) => {
          await this.deps.compliance.notifyNewBusiness({
            businessId: context.event.aggregateId,
            ownerId: context.event.ownerId,
            businessType: context.event.businessType,
            registrationNumber: context.event.registrationNumber,
            correlationId: context.metadata.correlationId
          });
          context.complianceNotified = true;
        },
        compensate: async (context) => {
          context.complianceNotified = false;
        }
      },
      {
        name: 'CreateComplianceRecord',
        execute: async (context) => {
          const recordId = await this.deps.compliance.createKYCRecord({
            businessId: context.event.aggregateId,
            status: 'UNDER_REVIEW',
            correlationId: context.metadata.correlationId
          });
          context.complianceRecordId = recordId;
          context.complianceRecordCreated = true;
        },
        compensate: async (context, sagaId) => {
          if (context.complianceRecordId) {
            await this.deps.compliance.revokeKYCRecord(
              context.complianceRecordId,
              context.metadata.correlationId
            );
          }
          context.complianceRecordCreated = false;
        }
      }
    ];
  }
}

export async function executeBusinessRegistrationSaga(
  event: BusinessRegisteredEvent,
  deps: BusinessRegistrationSagaDeps
): Promise<void> {
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

  const saga = new BusinessRegistrationSaga(deps);
  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error(`BusinessRegistrationSaga failed for business ${event.aggregateId}`, { error, correlationId });
    throw error;
  }
}
