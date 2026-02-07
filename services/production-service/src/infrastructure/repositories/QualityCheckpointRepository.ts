
import { PrismaClient } from '@prisma/client';
import { IQualityRepository } from '../../domain/interfaces/IQualityRepository';
import { QualityCheckpoint, QualityStatus } from '../../domain/entities/QualityCheckpoint.entity';

export class QualityCheckpointRepository implements IQualityRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(checkpoint: QualityCheckpoint): Promise<QualityCheckpoint> {
        const data = await this.prisma.production_QualityCheckpoint.create({
            data: {
                id: checkpoint.id,
                productionOrderId: (checkpoint as any).props.productionOrderId,
                status: checkpoint.status as any,
                passed: checkpoint.passed,
                defectCount: checkpoint.defectCount,
                inspectionDate: (checkpoint as any).props.inspectionDate,
                stage: (checkpoint as any).props.stage as any
            }
        });
        return this.toEntity(data);
    }

    async findByOrderId(productionOrderId: string): Promise<QualityCheckpoint[]> {
        const data = await this.prisma.production_QualityCheckpoint.findMany({ where: { productionOrderId } });
        return data.map(d => this.toEntity(d));
    }

    private toEntity(data: any): QualityCheckpoint {
        return new QualityCheckpoint({
            id: data.id,
            productionOrderId: data.productionOrderId,
            status: data.status as QualityStatus,
            passed: data.passed,
            defectCount: data.defectCount,
            inspectionDate: data.inspectionDate,
            stage: data.stage,
            images: data.images || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}
