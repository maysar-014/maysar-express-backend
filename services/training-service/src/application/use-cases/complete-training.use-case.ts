import { CompleteTrainingRequest, CompleteTrainingResponse } from '../dto/complete-training.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { TrainingScore } from '../../domain/value-objects/training-score.value-object';
import { EligibilityEngine } from '../../domain/engines/eligibility.engine';
import { NotFoundError } from '../../domain/errors/domain.error';

export class CompleteTrainingUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly eligibilityEngine: EligibilityEngine
    ) { }

    public async execute(request: CompleteTrainingRequest): Promise<CompleteTrainingResponse> {
        const { trainingRecordId, score } = request;

        const record = await this.trainingRecordRepo.findById(trainingRecordId);
        if (!record) {
            throw new NotFoundError('TrainingRecord', trainingRecordId);
        }

        const requirement = await this.requirementRepo.findByModule(record.moduleId);
        if (!requirement) {
            throw new NotFoundError('CertificationRequirement', record.moduleId);
        }

        const trainingScore = TrainingScore.create(score);
        record.complete(trainingScore, requirement.minimumScore, requirement.validityPeriodDays);

        await this.trainingRecordRepo.save(record);

        const passed = record.status === 'COMPLETED';

        if (passed) {
            // Trigger eligibility check
            const allRecords = await this.trainingRecordRepo.findByLearnerId(record.learnerId);
            const allRequirements = await this.requirementRepo.findAll();
            const eligibility = this.eligibilityEngine.checkEligibility(allRecords, allRequirements);

            // TODO: Publish LearnerEligibilityChangedEvent if eligibility changed
        }

        // TODO: Publish TrainingCompletedEvent or TrainingFailedEvent

        return {
            passed,
            score: record.score?.getValue() || 0,
            expiresAt: record.expiresAt
        };
    }
}
