import { TrainingServiceClient } from '../../application/use-cases/validate-expertise.use-case';
import { TrainingStatus } from '../../../../training-service/src/domain/value-objects/training-status.value-object';

export class HttpTrainingServiceClient implements TrainingServiceClient {
    async getCompletedModules(userId: string): Promise<string[]> {
        const { Container } = await import('../../../../training-service/src/infrastructure/container');
        const container = Container.getInstance();
        const records = await container.trainingRecordRepo.findByLearnerId(userId);
        return records
            .filter(record => record.status === TrainingStatus.COMPLETED)
            .map(record => record.moduleId);
    }

    async getModuleDetails(moduleId: string): Promise<{
        id: string;
        title: string;
        category: string;
        expertiseArea: string;
        level: string;
    } | null> {
        const { Container } = await import('../../../../training-service/src/infrastructure/container');
        const container = Container.getInstance();
        const module = await container.moduleRepo.findById(moduleId);
        if (!module) {
            return null;
        }
        return {
            id: module.id,
            title: module.name,
            category: module.category,
            expertiseArea: module.category,
            level: module.difficulty
        };
    }

    async getUserProgress(userId: string): Promise<{
        totalModulesCompleted: number;
        certificationsEarned: number;
        currentLevel: string;
        categories: Array<{ category: string; completedModules: number }>;
    }> {
        const { Container } = await import('../../../../training-service/src/infrastructure/container');
        const container = Container.getInstance();
        const records = await container.trainingRecordRepo.findByLearnerId(userId);
        const completed = records.filter(record => record.status === TrainingStatus.COMPLETED);
        return {
            totalModulesCompleted: completed.length,
            certificationsEarned: 0,
            currentLevel: completed.length >= 5 ? 'INTERMEDIATE' : 'BEGINNER',
            categories: []
        };
    }
}
