import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { TrainingModule } from '../../domain/entities/training-module.entity';
import { TrainingModuleMapper } from '../../application/mappers/training-module.mapper';

interface TrainingModuleDelegate {
    findMany(args?: Record<string, unknown>): Promise<unknown[]>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
}

interface TrainingModulePrisma {
    trainingModule?: TrainingModuleDelegate;
    training_TrainingModule?: TrainingModuleDelegate;
}

export class PrismaTrainingModuleRepository implements ITrainingModuleRepository {
    constructor(private readonly prisma: TrainingModulePrisma) { }

    public async findAll(): Promise<TrainingModule[]> {
        const modules = await this.moduleDelegate.findMany();
        return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
    }

    public async findById(id: string): Promise<TrainingModule | null> {
        const module = await this.moduleDelegate.findUnique({
            where: { id }
        });
        return module ? TrainingModuleMapper.toDomain(module) : null;
    }

    public async findByCategory(category: string): Promise<TrainingModule[]> {
        const modules = await this.moduleDelegate.findMany({
            where: { category }
        });
        return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
    }

    public async findWithPrerequisites(): Promise<TrainingModule[]> {
        const modules = await this.moduleDelegate.findMany({
            where: {
                prerequisites: {
                    isEmpty: false
                }
            }
        });
        return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
    }

    public async findAvailable(role: string): Promise<TrainingModule[]> {
        const modules = await this.moduleDelegate.findMany({
            where: {
                OR: [
                    { isPublic: true },
                    { targetRoles: { has: role } }
                ]
            }
        });
        return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
    }

    private get moduleDelegate(): TrainingModuleDelegate {
        const delegate = this.prisma.training_TrainingModule ?? this.prisma.trainingModule;
        if (!delegate) {
            throw new Error('Training module delegate is not configured on prisma client');
        }
        return delegate;
    }
}
