import { GetAvailableModulesRequest, GetAvailableModulesResponse } from '../dto/get-available-modules.dto';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { TrainingModuleMapper } from '../mappers/training-module.mapper';
import { TrainingPolicy } from '../../domain/policies/training.policy';

export class GetAvailableModulesUseCase {
    constructor(
        private readonly moduleRepo: ITrainingModuleRepository,
        private readonly recordRepo: ITrainingRecordRepository,
        private readonly trainingPolicy: TrainingPolicy
    ) { }

    public async execute(request: GetAvailableModulesRequest): Promise<GetAvailableModulesResponse> {
        const { learnerId, learnerRole } = request;

        // Fetch all modules available for this role or public
        const availableModules = await this.moduleRepo.findAvailable(learnerRole);

        // Fetch user records to check for recommendations/prerequisites
        const userRecords = await this.recordRepo.findByLearnerId(learnerId);
        const completedModuleIds = userRecords
            .filter(r => r.status === 'COMPLETED' && !r.isExpired())
            .map(r => r.moduleId);

        const recommendations: string[] = [];

        // Simple recommendation logic: modules whose prerequisites are met but not started
        for (const module of availableModules) {
            const isCompleted = completedModuleIds.includes(module.id);
            const inProgress = userRecords.some(r => r.moduleId === module.id && r.status === 'IN_PROGRESS');

            if (!isCompleted && !inProgress) {
                const missingPrereqs = module.getMissingPrerequisites(completedModuleIds);
                if (missingPrereqs.length === 0) {
                    recommendations.push(module.id);
                }
            }
        }

        return {
            modules: availableModules.map(m => TrainingModuleMapper.toDTO(m)),
            recommendations
        };
    }
}
