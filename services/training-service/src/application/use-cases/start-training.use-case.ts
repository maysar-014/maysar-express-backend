import { StartTrainingRequest, StartTrainingResponse } from '../dto/start-training.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { IEventPublisher, eventBus } from '@shared-events/eventBus';
import { TrainingPolicy } from '../../domain/policies/training.policy';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { NotFoundError } from '../../domain/errors/domain.error';

export class StartTrainingUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly moduleRepo: ITrainingModuleRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly trainingPolicy: TrainingPolicy,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public async execute(request: StartTrainingRequest): Promise<StartTrainingResponse> {
        const { learnerId, learnerRole, moduleId } = request;

        const module = await this.moduleRepo.findById(moduleId);
        if (!module) {
            throw new NotFoundError('TrainingModule', moduleId);
        }

        const requirement = await this.requirementRepo.findByModule(moduleId);
        if (!requirement) {
            throw new NotFoundError('CertificationRequirement', moduleId);
        }

        const existingRecords = await this.trainingRecordRepo.findByLearnerId(learnerId);
        const completedModuleIds = existingRecords
            .filter(r => r.status === 'COMPLETED' && !r.isExpired())
            .map(r => r.moduleId);

        const validation = this.trainingPolicy.canStartTraining(
            learnerId,
            learnerRole,
            module,
            existingRecords,
            requirement,
            completedModuleIds
        );

        // Training is always accessible, but we may have warnings/recommendations
        // These are informational only and don't block access

        let record = existingRecords.find(r => r.moduleId === moduleId);

        if (record) {
            record.start();
        } else {
            record = TrainingRecord.createNew(makeId(getModelPrefix('Training_TrainingRecord')), learnerId, learnerRole, moduleId);
            record.start();
        }

        await this.trainingRecordRepo.save(record);

        await this.events.publish('TrainingStarted.v1', {
            trainingRecordId: record.id,
            learnerId: record.learnerId,
            learnerRole: record.learnerRole,
            moduleId: record.moduleId,
            startedAt: record.startedAt,
            attemptNumber: record.attempts
        });

        return {
            trainingRecordId: record.id,
            status: record.status,
            warnings: validation.warnings,
            recommendations: validation.recommendations
        };
    }
}
