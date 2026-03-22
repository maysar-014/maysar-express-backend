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

    private warnedMissingDelegate = false;
    private readonly fallbackRecords = new Map<string, TrainingRecord>();

    private warnMissingDelegate(message: string): void {
        if (this.warnedMissingDelegate) return;
        this.warnedMissingDelegate = true;
        console.warn(message);
    }

    public async save(record: TrainingRecord): Promise<void> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            this.fallbackRecords.set(record.id, record);
            return;
        }

        try {
            const data = TrainingRecordMapper.toPersistence(record);
            await delegate.upsert({
                where: { id: record.id },
                update: data,
                create: data
            });
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Record persistence failed; storing in fallback.');
                this.fallbackRecords.set(record.id, record);
                return;
            }
            throw error;
        }
    }

    public async findById(id: string): Promise<TrainingRecord | null> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            if (this.fallbackRecords.has(id)) {
                return this.fallbackRecords.get(id) || null;
            }
            if (process.env.NODE_ENV !== 'production') {
                const fallback = TrainingRecord.createNew(id, 'learner-default', 'buyer', 'module-default');
                this.fallbackRecords.set(id, fallback);
                return fallback;
            }
            return null;
        }

        try {
            const record = await delegate.findUnique({
                where: { id }
            });
            if (record) {
                return TrainingRecordMapper.toDomain(record);
            }
            if (process.env.NODE_ENV !== 'production') {
                const fallback = TrainingRecord.createNew(id, 'learner-default', 'buyer', 'module-default');
                this.fallbackRecords.set(id, fallback);
                return fallback;
            }
            return null;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Record lookup failed; using fallback.');
                if (this.fallbackRecords.has(id)) {
                    return this.fallbackRecords.get(id) || null;
                }
                const fallback = TrainingRecord.createNew(id, 'learner-default', 'buyer', 'module-default');
                this.fallbackRecords.set(id, fallback);
                return fallback;
            }
            throw error;
        }
    }

    public async findByLearnerId(learnerId: string): Promise<TrainingRecord[]> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            return Array.from(this.fallbackRecords.values()).filter((record) => record.learnerId === learnerId);
        }

        try {
            const records = await delegate.findMany({
                where: { learnerId }
            });
            return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Record lookup failed; using fallback.');
                return Array.from(this.fallbackRecords.values()).filter((record) => record.learnerId === learnerId);
            }
            throw error;
        }
    }

    public async findByModule(learnerId: string, moduleId: string): Promise<TrainingRecord | null> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            return (
                Array.from(this.fallbackRecords.values()).find(
                    (record) => record.learnerId === learnerId && record.moduleId === moduleId
                ) || null
            );
        }

        try {
            const record = await delegate.findFirst({
                where: { learnerId, moduleId }
            });
            return record ? TrainingRecordMapper.toDomain(record) : null;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Record lookup failed; using fallback.');
                return (
                    Array.from(this.fallbackRecords.values()).find(
                        (record) => record.learnerId === learnerId && record.moduleId === moduleId
                    ) || null
                );
            }
            throw error;
        }
    }

    public async findActive(learnerId: string): Promise<TrainingRecord[]> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            return Array.from(this.fallbackRecords.values()).filter(
                (record) =>
                    record.learnerId === learnerId &&
                    ['IN_PROGRESS', 'COMPLETED'].includes(record.status)
            );
        }

        try {
            const records = await delegate.findMany({
                where: {
                    learnerId,
                    status: { in: ['IN_PROGRESS', 'COMPLETED'] }
                }
            });
            return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Active record lookup failed; using fallback.');
                return Array.from(this.fallbackRecords.values()).filter(
                    (record) =>
                        record.learnerId === learnerId &&
                        ['IN_PROGRESS', 'COMPLETED'].includes(record.status)
                );
            }
            throw error;
        }
    }

    public async findExpired(): Promise<TrainingRecord[]> {
        const delegate = this.recordDelegate;
        if (!delegate) {
            return Array.from(this.fallbackRecords.values()).filter(
                (record) => record.status === 'COMPLETED' && record.isExpired()
            );
        }

        try {
            const records = await delegate.findMany({
                where: {
                    status: 'COMPLETED',
                    expiresAt: { lt: new Date() }
                }
            });
            return records.map((record: unknown) => TrainingRecordMapper.toDomain(record));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Expired record lookup failed; using fallback.');
                return Array.from(this.fallbackRecords.values()).filter(
                    (record) => record.status === 'COMPLETED' && record.isExpired()
                );
            }
            throw error;
        }
    }

    private get recordDelegate(): TrainingRecordDelegate | null {
        const delegate = this.prisma.training_TrainingRecord ?? this.prisma.trainingRecord;
        if (!delegate) {
            this.warnMissingDelegate('[training] Training record delegate is not configured on prisma client; using fallback.');
            return null;
        }
        return delegate;
    }
}
