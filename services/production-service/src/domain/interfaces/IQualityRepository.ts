
import { QualityCheckpoint } from '../entities/QualityCheckpoint.entity';

export interface IQualityRepository {
    save(checkpoint: QualityCheckpoint): Promise<QualityCheckpoint>;
    findByOrderId(orderId: string): Promise<QualityCheckpoint[]>;
}
