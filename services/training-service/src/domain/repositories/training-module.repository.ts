import { TrainingModule } from '../entities/training-module.entity';

export interface ITrainingModuleRepository {
    findAll(): Promise<TrainingModule[]>;
    findById(id: string): Promise<TrainingModule | null>;
    findByCategory(category: string): Promise<TrainingModule[]>;
    findWithPrerequisites(): Promise<TrainingModule[]>;
}
