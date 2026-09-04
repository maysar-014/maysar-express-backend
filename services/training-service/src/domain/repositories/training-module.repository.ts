import { TrainingModule } from '../entities/training-module.entity';

export interface ITrainingModuleRepository {
    // Read
    findAll(): Promise<TrainingModule[]>;
    findById(id: string): Promise<TrainingModule | null>;
    findByCategory(category: string): Promise<TrainingModule[]>;
    findWithPrerequisites(): Promise<TrainingModule[]>;
    findAvailable(role: string): Promise<TrainingModule[]>;

    // Write (admin only)
    save(module: TrainingModule): Promise<void>;
    update(id: string, data: Partial<{
        name: string;
        description: string;
        content: unknown;
        contentType: string;
        durationMinutes: number;
        category: string;
        prerequisites: string[];
        targetRoles: string[];
        isPublic: boolean;
        difficulty: string;
    }>): Promise<TrainingModule | null>;
    delete(id: string): Promise<void>;
}
