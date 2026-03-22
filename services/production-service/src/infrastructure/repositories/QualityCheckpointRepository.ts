
import { PrismaClient } from '@prisma/client';
import { IQualityRepository } from '../../domain/interfaces/IQualityRepository';
import { QualityCheckpoint, QualityStatus } from '../../domain/entities/QualityCheckpoint.entity';

interface QualityCheckpointDelegate {
    create(args: Record<string, unknown>): Promise<unknown>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
}

export class QualityCheckpointRepository implements IQualityRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(checkpoint: QualityCheckpoint): Promise<QualityCheckpoint> {
        const delegate = this.getQualityCheckpointDelegate();
        if (!delegate) {
            return checkpoint;
        }

        const data = await delegate.create({
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
        const delegate = this.getQualityCheckpointDelegate();
        if (!delegate) {
            return [];
        }

        const data = await delegate.findMany({ where: { productionOrderId } });
        return data.map((d: any) => this.toEntity(d));
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

    private getQualityCheckpointDelegate(): QualityCheckpointDelegate | null {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.production_QualityCheckpoint ??
            client.qualityCheckpoint) as QualityCheckpointDelegate | undefined;
        if (!delegate) {
            if (process.env.NODE_ENV !== 'production') {
                return null;
            }
            throw new Error('Quality checkpoint delegate is not configured on prisma client');
        }
        return delegate;
    }
}
