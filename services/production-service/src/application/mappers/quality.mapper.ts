
import { QualityCheckpoint } from '../../domain/entities/QualityCheckpoint.entity';
import { QualityCheckpointResponseDto } from '../dto/quality-checkpoint.dto';

export class QualityMapper {
    static toDto(checkpoint: QualityCheckpoint): QualityCheckpointResponseDto {
        return {
            id: checkpoint.id,
            orderId: 'TODO: Fix entity to expose orderId', // The entity has private props
            status: checkpoint.status,
            passed: checkpoint.passed ?? false,
            defectCount: checkpoint.defectCount,
            inspectionDate: new Date().toISOString() // Should come from entity
        };
    }
}
