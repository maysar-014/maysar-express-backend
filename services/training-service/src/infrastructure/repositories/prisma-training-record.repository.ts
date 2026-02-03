import { PrismaClient } from '@prisma/client';
import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingRecordMapper } from '../../application/mappers/training-record.mapper';

export class PrismaTrainingRecordRepository implements ITrainingRecordRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async save(record: TrainingRecord): Promise<void> {
        const data = TrainingRecordMapper.toPersistence(record);
        await this.prisma.trainingRecord.upsert({
            where: { id: record.id },
            update: data,
            create: data
        });
    }

    public async findById(id: string): Promise<TrainingRecord | null> {
        const record = await this.prisma.trainingRecord.findUnique({
            where: { id }
        });
        return record ? TrainingRecordMapper.toDomain(record) : null;
    }

    public async findByLearnerId(learnerId: string): Promise<TrainingRecord[]> {
        const records = await this.prisma.trainingRecord.findMany({
            where: { learnerId }
        });
        return records.map(record => TrainingRecordMapper.toDomain(record));
    }

    public async findByModule(learnerId: string, moduleId: string): Promise<TrainingRecord | null> {
        const record = await this.prisma.trainingRecord.findFirst({
            where: { learnerId, moduleId }
        });
        return record ? TrainingRecordMapper.toDomain(record) : null;
    }

    public async findActive(learnerId: string): Promise<TrainingRecord[]> {
        const records = await this.prisma.trainingRecord.findMany({
            where: {
                learnerId,
                status: { in: ['IN_PROGRESS', 'COMPLETED'] }
            }
        });
        return records.map(record => TrainingRecordMapper.toDomain(record));
    }
}
