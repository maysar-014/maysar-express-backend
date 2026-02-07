
import { ProductionMetrics } from '../../domain/entities/ProductionMetrics.entity';
import { ProductionMetricsDto } from '../dto/production-metrics.dto';

export class MetricsMapper {
    static toDto(metrics: ProductionMetrics): ProductionMetricsDto {
        return {
            orderId: metrics.productionOrderId,
            leadTimeHours: metrics.leadTime ? metrics.leadTime.toHours() : 0,
            efficiency: 0, // Calculated field, might need logic
            defectRate: metrics.qualityScore ? metrics.qualityScore.defectRate : 0,
            qualityScore: metrics.qualityScore ? metrics.qualityScore.score : 0
        };
    }
}
