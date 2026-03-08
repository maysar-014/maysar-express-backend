import { ITrainingRecordRepository } from '../../domain/repositories/training-record.repository';
import { TrainingRecord } from '../../domain/entities/training-record.entity';
import { TrainingRecordMapper } from '../../application/mappers/training-record.mapper';

interface TrainingRecordDelegate {
    upsert(args?: unknown): Promise<unknown>;
    findUnique(args?: unknown): Promise<unknown | null>;
    findMany(args?: unknown): Promise<unknown[]>;
    findFirst(args?: unknown): Promise<unknown | null>;
}

interface TrainingRecordPrisma {
    trainingRecord?: TrainingRecordDelegate;
    training_TrainingRecord?: TrainingRecordDelegate;
}

export class PrismaTrainingRecordRepository implements ITrainingRecordRepository {
    constructor(private readonly prisma: TrainingRecordPrisma) { }

    public async save(record: TrainingRecord): Promise<void> {
        const data = TrainingRecordMapper.toPersistence(record);
        await this.recordDelegate.upsert({
            where: { id: record.id },
            update: data,
            create: data
        });
    }

    public async findById(id: string): Promise<TrainingRecord | null> {
        const record = await this.recordDelegate.findUnique({
            where: { id }
        });
        return record ? TrainingRecordMapper.toDomain(record) : null;
    }

    public async findByLearnerId(learnerId: string): Promise<TrainingRecord[]> {
        const records = await this.recordDelegate.findMany({
            where: { learnerId }
        });
        return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
    }

    public async findByModule(learnerId: string, moduleId: string): Promise<TrainingRecord | null> {
        const record = await this.recordDelegate.findFirst({
            where: { learnerId, moduleId }
        });
        return record ? TrainingRecordMapper.toDomain(record) : null;
    }

    public async findActive(learnerId: string): Promise<TrainingRecord[]> {
        const records = await this.recordDelegate.findMany({
            where: {
                learnerId,
                status: { in: ['IN_PROGRESS', 'COMPLETED'] }
            }
        });
        return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
    }

    public async findExpired(): Promise<TrainingRecord[]> {
        const records = await this.recordDelegate.findMany({
            where: {
                status: 'COMPLETED',
                expiresAt: { lt: new Date() }
            }
        });
        return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
    }

    private get recordDelegate(): TrainingRecordDelegate {
        const delegate = this.prisma.training_TrainingRecord ?? this.prisma.trainingRecord;
        if (!delegate) {
            throw new Error('Training record delegate is not configured on prisma client');
        }
        return delegate;
    }
}
