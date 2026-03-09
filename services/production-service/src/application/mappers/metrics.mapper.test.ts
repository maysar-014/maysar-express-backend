import { MetricsMapper } from './metrics.mapper';
import { ProductionMetrics } from '../../domain/entities/ProductionMetrics.entity';
import { LeadTime } from '../../domain/value-objects/lead-time.value-object';
import { QualityScore } from '../../domain/value-objects/quality-score.value-object';

describe('MetricsMapper', () => {
  it('maps metrics with lead time and quality score', () => {
    const metrics = new ProductionMetrics({
      id: 'm1',
      productionOrderId: 'order-1',
      leadTime: new LeadTime({ days: 2, confidence: 90 }),
      qualityScore: new QualityScore({ score: 95, totalInspections: 20, passedInspections: 19 }),
      createdAt: new Date('2026-03-08T00:00:00.000Z')
    });

    const dto = MetricsMapper.toDto(metrics);

    expect(dto.orderId).toBe('order-1');
    expect(dto.leadTimeHours).toBe(48);
    expect(dto.defectRate).toBe(5);
    expect(dto.qualityScore).toBe(95);
    expect(dto.efficiency).toBe(0);
  });

  it('maps defaults when optional fields are missing', () => {
    const metrics = new ProductionMetrics({
      id: 'm2',
      productionOrderId: 'order-2',
      createdAt: new Date('2026-03-08T00:00:00.000Z')
    });

    const dto = MetricsMapper.toDto(metrics);

    expect(dto.leadTimeHours).toBe(0);
    expect(dto.defectRate).toBe(0);
    expect(dto.qualityScore).toBe(0);
  });
});
