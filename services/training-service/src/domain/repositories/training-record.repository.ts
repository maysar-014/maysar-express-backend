import { TrainingRecord } from '../entities/training-record.entity';

export interface ITrainingRecordRepository {
    save(record: TrainingRecord): Promise<void>;
    findById(id: string): Promise<TrainingRecord | null>;
    findByLearnerId(learnerId: string): Promise<TrainingRecord[]>;
    findByModule(learnerId: string, moduleId: string): Promise<TrainingRecord | null>;
    findActive(learnerId: string): Promise<TrainingRecord[]>;
}
