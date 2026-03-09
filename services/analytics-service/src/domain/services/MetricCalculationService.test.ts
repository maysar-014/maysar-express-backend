import { AnalyticsEvent } from '../entities/AnalyticsEvent.entity';
import { MetricValue } from '../value-objects/metric-value.value-object';
import { MetricCalculationService } from './MetricCalculationService';

describe('MetricCalculationService', () => {
  const service = new MetricCalculationService();

  const event = (type: string, amount: number): AnalyticsEvent =>
    new AnalyticsEvent({
      id: `${type}-${amount}`,
      type,
      data: { amount },
      timestamp: new Date('2026-03-09T00:00:00.000Z'),
      status: 'pending'
    });

  it('calculates revenue from order/payment events only', () => {
    const revenue = service.calculateRevenue([
      event('order', 100),
      event('payment', 40),
      event('click', 999)
    ]);

    expect(revenue).toBeInstanceOf(MetricValue);
    expect(revenue.toNumber()).toBe(140);
  });

  it('calculates order count and conversion rate safely', () => {
    expect(service.calculateOrderCount([event('order', 1), event('payment', 1), event('order', 1)]).toNumber()).toBe(2);
    expect(service.calculateConversionRate(0, 5).toNumber()).toBe(0);
    expect(service.calculateConversionRate(200, 50).toNumber()).toBe(25);
  });

  it('calculates average order value with divide-by-zero guard', () => {
    const avg = service.calculateAverageOrderValue(new MetricValue(500), new MetricValue(5));
    const zero = service.calculateAverageOrderValue(new MetricValue(500), new MetricValue(0));

    expect(avg.toNumber()).toBe(100);
    expect(zero.toNumber()).toBe(0);
  });
});

