import { PrismaClient } from '@prisma/client';
import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { TrainingModule } from '../../domain/entities/training-module.entity';
import { TrainingModuleMapper } from '../../application/mappers/training-module.mapper';

export class PrismaTrainingModuleRepository implements ITrainingModuleRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async findAll(): Promise<TrainingModule[]> {
        const modules = await this.prisma.trainingModule.findMany();
        return modules.map(m => TrainingModuleMapper.toDomain(m));
    }

    public async findById(id: string): Promise<TrainingModule | null> {
        const module = await this.prisma.trainingModule.findUnique({
            where: { id }
        });
        return module ? TrainingModuleMapper.toDomain(module) : null;
    }

    public async findByCategory(category: string): Promise<TrainingModule[]> {
        const modules = await this.prisma.trainingModule.findMany({
            where: { category }
        });
        return modules.map(m => TrainingModuleMapper.toDomain(m));
    }

    public async findWithPrerequisites(): Promise<TrainingModule[]> {
        const modules = await this.prisma.trainingModule.findMany({
            where: {
                prerequisites: {
                    isEmpty: false
                }
            }
        });
        return modules.map(m => TrainingModuleMapper.toDomain(m));
    }

    public async findAvailable(role: string): Promise<TrainingModule[]> {
        const modules = await this.prisma.trainingModule.findMany({
            where: {
                OR: [
                    { isPublic: true },
                    { targetRoles: { has: role } }
                ]
            }
        });
        return modules.map(m => TrainingModuleMapper.toDomain(m));
    }
}
