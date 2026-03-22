import { CompleteTrainingRequest, CompleteTrainingResponse } from '../dto/complete-training.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { IEventPublisher, eventBus } from '@shared-events/eventBus';
import { TrainingScore } from '../../domain/value-objects/training-score.value-object';
import { EligibilityEngine } from '../../domain/engines/eligibility.engine';
import { NotFoundError } from '../../domain/errors/domain.error';
import { TrainingStatus } from '../../domain/value-objects/training-status.value-object';

export class CompleteTrainingUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly eligibilityEngine: EligibilityEngine,
        private readonly events: IEventPublisher = eventBus
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
        try {
            record.complete(trainingScore, requirement.minimumScore, requirement.validityPeriodDays);
        } catch (error: any) {
            const message = String(error?.message || '');
            if (message.toLowerCase().includes('not in progress')) {
                const domainError = new Error('Training not in progress') as Error & { status?: number };
                domainError.status = 400;
                throw domainError;
            }
            throw error;
        }

        await this.trainingRecordRepo.save(record);

        const passed = record.status === TrainingStatus.COMPLETED;
        const remainingAttempts = Math.max(0, requirement.maxAttempts - record.attempts);

        if (passed) {
            // Trigger eligibility check
            const allRecords = await this.trainingRecordRepo.findByLearnerId(record.learnerId);
            const allRequirements = await this.requirementRepo.findAll();
            const eligibility = this.eligibilityEngine.checkEligibility(allRecords, allRequirements);

            await this.events.publish('LearnerEligibilityChanged.v1', {
                learnerId: record.learnerId,
                learnerRole: record.learnerRole,
                eligible: eligibility.eligible,
                missingRequirements: eligibility.missingRequirements,
                changedAt: new Date()
            });

            await this.events.publish('TrainingCompleted.v1', {
                trainingRecordId: record.id,
                learnerId: record.learnerId,
                learnerRole: record.learnerRole,
                moduleId: record.moduleId,
                score: record.score?.getValue(),
                passed: true,
                completedAt: record.completedAt,
                expiresAt: record.expiresAt,
                remainingAttempts
            });
        } else {
            await this.events.publish('TrainingFailed.v1', {
                trainingRecordId: record.id,
                learnerId: record.learnerId,
                learnerRole: record.learnerRole,
                moduleId: record.moduleId,
                score: record.score?.getValue(),
                failedAt: record.completedAt,
                remainingAttempts
            });
        }

        return {
            passed,
            score: record.score?.getValue() || 0,
            expiresAt: record.expiresAt
        };
    }
}
