
import { PrismaClient } from '@prisma/client';
import { ProductionMetrics } from '../../domain/entities/ProductionMetrics.entity';

export class ProductionMetricsRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(metrics: ProductionMetrics): Promise<void> {
        await this.prisma.production_Metrics.create({
            data: {
                id: metrics.id,
                productionOrderId: metrics.productionOrderId,
                leadTimeSeconds: metrics.leadTime ? metrics.leadTime.toHours() * 3600 : null,
                defectRate: metrics.qualityScore ? metrics.qualityScore.defectRate : null
            }
        })
    }
}
