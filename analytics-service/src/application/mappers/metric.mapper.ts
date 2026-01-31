import { Metric } from '../../domain/entities/Metric.entity';
import { MetricValue } from '../../domain/value-objects/metric-value.value-object';
import { MetricDto } from '../dto/metric.dto';

export class MetricMapper {
    static toDto(entity: Metric): MetricDto {
        return {
            id: entity.id,
            type: entity.type,
            value: entity.value.toNumber(),
            dimension: entity.dimension,
            period: entity.period,
            timestamp: entity.timestamp.toISOString(),
            confidence: entity.confidence
        };
    }

    static toEntity(dto: MetricDto): Metric {
        return new Metric({
            id: dto.id || `met_${Date.now()}`,
            type: dto.type,
            value: new MetricValue(dto.value),
            dimension: dto.dimension,
            period: dto.period,
            timestamp: new Date(dto.timestamp),
            confidence: dto.confidence
        });
    }
}
