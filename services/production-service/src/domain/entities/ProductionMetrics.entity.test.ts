import { LeadTime } from '../value-objects/lead-time.value-object';
import { QualityScore } from '../value-objects/quality-score.value-object';
import { ProductionMetrics } from './ProductionMetrics.entity';

describe('ProductionMetrics', () => {
  it('exposes metrics fields and computes efficiency when cycle time exists', () => {
    const metrics = new ProductionMetrics({
      id: 'pm-1',
      productionOrderId: 'po-1',
      leadTime: new LeadTime({ days: 2, confidence: 85 }),
      cycleTimeSeconds: 400,
      qualityScore: new QualityScore({ score: 95, totalInspections: 20, passedInspections: 19 }),
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });

    metrics.calculateEfficiency(200);

    expect(metrics.productionOrderId).toBe('po-1');
    expect(metrics.leadTime?.days).toBe(2);
    expect(metrics.qualityScore?.score).toBe(95);
    expect(metrics.efficiency).toBe(50);
  });

  it('keeps efficiency undefined when cycle time is absent', () => {
    const metrics = new ProductionMetrics({
      id: 'pm-2',
      productionOrderId: 'po-2',
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });

    metrics.calculateEfficiency(200);
    expect(metrics.efficiency).toBeUndefined();
  });
});
