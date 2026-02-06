import { CheckEligibilityRequest, EligibilityResponse } from '../dto/eligibility.dto';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { EligibilityEngine } from '../../domain/engines/eligibility.engine';

export class CheckEligibilityUseCase {
    constructor(
        private readonly trainingRecordRepo: ITrainingRecordRepository,
        private readonly requirementRepo: ICertificationRequirementRepository,
        private readonly eligibilityEngine: EligibilityEngine
    ) { }

    public async execute(request: CheckEligibilityRequest): Promise<EligibilityResponse> {
        const { learnerId } = request;

        const allRecords = await this.trainingRecordRepo.findByLearnerId(learnerId);
        const allRequirements = await this.requirementRepo.findAll();

        const result = this.eligibilityEngine.checkEligibility(allRecords, allRequirements);

        return {
            eligible: result.eligible,
            completionPercentage: result.completionPercentage,
            missingRequirements: result.missingRequirements,
            completedModules: result.completedModules,
            inProgressModules: result.inProgressModules
        };
    }
}

