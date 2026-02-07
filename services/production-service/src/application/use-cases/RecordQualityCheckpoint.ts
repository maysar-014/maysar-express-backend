
import { QualityCheckpointDto } from '../dto/quality-checkpoint.dto';
import { QualityControlEngine } from '../../domain/engines/QualityControlEngine';
import { IQualityRepository } from '../../domain/interfaces/IQualityRepository';
import { QualityCheckpoint, QualityStatus } from '../../domain/entities/QualityCheckpoint.entity';

export class RecordQualityCheckpoint {
    constructor(
        private readonly repo: IQualityRepository,
        private readonly qualityEngine: QualityControlEngine
    ) { }

    async execute(dto: QualityCheckpointDto): Promise<void> {
        const checkpoint = new QualityCheckpoint({
            id: crypto.randomUUID(),
            productionOrderId: dto.orderId,
            status: dto.passed ? QualityStatus.PASSED : QualityStatus.FAILED,
            passed: dto.passed,
            defectCount: dto.defectCount,
            notes: dto.notes,
            images: dto.images || [],
            inspectionDate: new Date(),
            stage: 'QUALITY_CONTROL',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await this.repo.save(checkpoint);

        // In a real saga, checking compliance would trigger events
    }
}
