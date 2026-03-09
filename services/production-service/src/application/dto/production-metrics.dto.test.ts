import type { ProductionMetricsDto } from './production-metrics.dto';

describe('ProductionMetricsDto', () => {
  it('supports metrics payload contract', () => {
    const dto: ProductionMetricsDto = {
      orderId: 'order-4',
      leadTimeHours: 48,
      efficiency: 0.92,
      defectRate: 0.03,
      qualityScore: 97
    };

    expect(dto.orderId).toBe('order-4');
    expect(dto.qualityScore).toBeGreaterThan(90);
  });
});
