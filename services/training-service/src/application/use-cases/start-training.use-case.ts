import { StartTrainingRequest, StartTrainingResponse } from '../dto/start-training.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { TrainingPolicy } from '../../domain/policies/training.policy';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, BusinessRuleError } from '../../domain/errors/domain.error';

export class StartTrainingUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly moduleRepo: ITrainingModuleRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly trainingPolicy: TrainingPolicy
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
            module,
            existingRecords,
            requirement,
            completedModuleIds
        );

        if (!validation.canStart) {
            throw new BusinessRuleError(validation.reason || 'Cannot start training');
        }

        let record = existingRecords.find(r => r.moduleId === moduleId);

        if (record) {
            record.start();
        } else {
            record = TrainingRecord.createNew(uuidv4(), learnerId, learnerRole, moduleId);
            record.start();
        }

        await this.trainingRecordRepo.save(record);

        // TODO: Publish TrainingStartedEvent via outbox

        return {
            trainingRecordId: record.id,
            status: record.status
        };
    }
}
