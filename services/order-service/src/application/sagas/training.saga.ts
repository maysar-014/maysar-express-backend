import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository, SagaStatus } from '@shared/saga/saga.log';
import { EventIdempotency } from '@shared/middleware/idempotency';

export enum TrainingModule {
  SAFETY_BASICS = 'safety_basics',
  CUSTOMER_SERVICE = 'customer_service',
  DELIVERY_PROCEDURES = 'delivery_procedures',
  VEHICLE_MAINTENANCE = 'vehicle_maintenance',
  EMERGENCY_PROTOCOLS = 'emergency_protocols'
}

export enum TrainingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface TrainingRecord {
  id: string;
  courierId: string;
  module: TrainingModule;
  status: TrainingStatus;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
  expiresAt?: Date;
}

export interface TrainingSagaContext {
  courierId: string;
  module: TrainingModule;
  record?: TrainingRecord;
  score?: number;
  eligible?: boolean;
}

export interface ITrainingRecordRepository {
  save(record: TrainingRecord): Promise<void>;
  findByModule(courierId: string, module: TrainingModule): Promise<TrainingRecord | null>;
  findAll(courierId: string): Promise<TrainingRecord[]>;
}

export interface ICourierEligibilityPort {
  updateEligibility(courierId: string, eligible: boolean): Promise<void>;
}

/**
 * Training Saga - Standardized Orchestration
 */
export class TrainingSaga extends DistributedSagaOrchestrator<TrainingSagaContext> {
  protected sagaType = 'TrainingSaga';

  private readonly certificationRequirements = [
    { module: TrainingModule.SAFETY_BASICS, minimumScore: 80, validityPeriod: 365, mandatory: true },
    { module: TrainingModule.CUSTOMER_SERVICE, minimumScore: 75, validityPeriod: 180, mandatory: true },
    { module: TrainingModule.DELIVERY_PROCEDURES, minimumScore: 85, validityPeriod: 365, mandatory: true },
    { module: TrainingModule.VEHICLE_MAINTENANCE, minimumScore: 70, validityPeriod: 180, mandatory: false },
    { module: TrainingModule.EMERGENCY_PROTOCOLS, minimumScore: 90, validityPeriod: 365, mandatory: true }
  ];

  private readonly eventIdempotency: EventIdempotency;

  constructor(
    sagaLogRepository: ISagaLogRepository,
    serviceName: string,
    private readonly trainingRecordRepository: ITrainingRecordRepository,
    private readonly eligibilityPort: ICourierEligibilityPort,
    eventIdempotency: EventIdempotency
  ) {
    super(sagaLogRepository, serviceName);
    this.eventIdempotency = eventIdempotency;
  }

  protected defineSteps(): SagaStep<TrainingSagaContext>[] {
    return [
      {
        name: 'start_training',
        execute: async (context, sagaId) => {
          const existingRecord = await this.trainingRecordRepository.findByModule(
            context.courierId,
            context.module
          );

          if (existingRecord && existingRecord.status === TrainingStatus.IN_PROGRESS) {
            context.record = existingRecord;
            return;
          }

          const trainingRecord: TrainingRecord = {
            id: sagaId, // Using sagaId as recordId for simplicity if not provided
            courierId: context.courierId,
            module: context.module,
            status: TrainingStatus.IN_PROGRESS,
            startedAt: new Date(),
            attempts: existingRecord ? existingRecord.attempts + 1 : 1
          };

          await this.trainingRecordRepository.save(trainingRecord);
          context.record = trainingRecord;
        },
        compensate: async (context, sagaId) => {
          if (!context.record) return;
          context.record.status = TrainingStatus.FAILED;
          await this.trainingRecordRepository.save(context.record);
        }
      },
      {
        name: 'record_completion',
        execute: async (context, sagaId) => {
          if (!context.record || context.score === undefined) {
            // If score not provided yet, wait for external completion
            // This step will be completed via completeStep(sagaId, 'record_completion', { score: ... })
            throw new Error('Waiting for training score');
          }

          const requirement = this.certificationRequirements.find(req => req.module === context.module);
          const passed = context.score >= (requirement?.minimumScore || 70);

          context.record.status = passed ? TrainingStatus.COMPLETED : TrainingStatus.FAILED;
          context.record.completedAt = new Date();
          context.record.score = context.score;

          if (passed && requirement) {
            context.record.expiresAt = new Date(Date.now() + requirement.validityPeriod * 24 * 60 * 60 * 1000);
          }

          await this.trainingRecordRepository.save(context.record);
        },
        compensate: async (context, sagaId) => {
          if (!context.record) return;
          context.record.status = TrainingStatus.IN_PROGRESS;
          context.record.completedAt = undefined;
          context.record.score = undefined;
          await this.trainingRecordRepository.save(context.record);
        }
      },
      {
        name: 'update_eligibility',
        execute: async (context, sagaId) => {
          const allRecords = await this.trainingRecordRepository.findAll(context.courierId);
          const mandatoryRequirements = this.certificationRequirements.filter(req => req.mandatory);

          let eligible = true;
          for (const req of mandatoryRequirements) {
            const record = allRecords.find(r => r.module === req.module);
            const isExpired = record?.expiresAt ? new Date() > record.expiresAt : false;

            if (!record || record.status !== TrainingStatus.COMPLETED || isExpired) {
              eligible = false;
              break;
            }
          }

          context.eligible = eligible;
          await this.eligibilityPort.updateEligibility(context.courierId, eligible);

          await (this as any).publishCommand('CourierEligibilityUpdated', {
            courierId: context.courierId,
            eligible
          }, sagaId, sagaId);
        },
        compensate: async (context, sagaId) => {
          // Revert eligibility if needed, though usually safety-first means we'd keep it restricted
          await this.eligibilityPort.updateEligibility(context.courierId, false);
        }
      }
    ];
  }

  // External completion method
  async handleTrainingFinished(sagaId: string, score: number): Promise<void> {
    await this.eventIdempotency.withIdempotency(
      `${sagaId}:training_finished:${score}`,
      'TrainingSaga.TrainingFinished',
      () => this.completeStep(sagaId, 'record_completion', undefined, async (saga) => {
        const context = saga.payload as TrainingSagaContext;
        context.score = score;
      })
    );
  }
}