
import { PrismaClient } from '@prisma/client';
import { ProductionMetrics } from '../../domain/entities/ProductionMetrics.entity';

interface ProductionMetricsDelegate {
    create(args: Record<string, unknown>): Promise<unknown>;
}

export class ProductionMetricsRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(metrics: ProductionMetrics): Promise<void> {
        await this.metricsDelegate.create({
            data: {
                id: metrics.id,
                productionOrderId: metrics.productionOrderId,
                leadTimeSeconds: metrics.leadTime ? metrics.leadTime.toHours() * 3600 : null,
                defectRate: metrics.qualityScore ? metrics.qualityScore.defectRate : null
            }
        })
    }

    private get metricsDelegate(): ProductionMetricsDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.production_Metrics ??
            client.productionMetrics) as ProductionMetricsDelegate | undefined;
        if (!delegate) {
            throw new Error('Production metrics delegate is not configured on prisma client');
        }
        return delegate;
    }
}
