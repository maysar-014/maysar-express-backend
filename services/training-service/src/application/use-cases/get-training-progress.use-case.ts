import { GetTrainingProgressRequest, TrainingProgressResponse } from '../dto/training-progress.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { EligibilityEngine } from '../../domain/engines/eligibility.engine';
import { TrainingRecordMapper } from '../mappers/training-record.mapper';

export class GetTrainingProgressUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly eligibilityEngine: EligibilityEngine
    ) { }

    public async execute(request: GetTrainingProgressRequest): Promise<TrainingProgressResponse> {
        const { learnerId } = request;

        const allRecords = await this.trainingRecordRepo.findByLearnerId(learnerId);
        const allRequirements = await this.requirementRepo.findAll();

        const completed = allRecords
            .filter(r => r.status === 'COMPLETED' && !r.isExpired())
            .map(r => TrainingRecordMapper.toDTO(r));

        const inProgress = allRecords
            .filter(r => r.status === 'IN_PROGRESS')
            .map(r => TrainingRecordMapper.toDTO(r));

        const completedModuleIds = completed.map(r => r.moduleId);
        const required = allRequirements
            .filter(req => req.mandatory && !completedModuleIds.includes(req.module))
            .map(req => req.module);

        const eligibility = this.eligibilityEngine.checkEligibility(allRecords, allRequirements);

        return {
            completed,
            inProgress,
            required,
            eligible: eligibility.eligible
        };
    }
}
