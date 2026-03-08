import type { IEventBus as AnalyticsEventBus } from '../../../../analytics-service/src/domain/interfaces/IEventBus';
import type { IEventBus as ProductionEventBus } from './IEventBus';

describe('IEventBus contract re-export', () => {
  it('supports a compatible event bus implementation in both modules', async () => {
    const publish: ProductionEventBus['publish'] = (async (..._args: unknown[]) => undefined) as ProductionEventBus['publish'];
    const emit: ProductionEventBus['emit'] = (async (..._args: unknown[]) => undefined) as ProductionEventBus['emit'];
    const subscribe: ProductionEventBus['subscribe'] = (async (..._args: unknown[]) => undefined) as ProductionEventBus['subscribe'];

    const productionBus: ProductionEventBus = { publish, emit, subscribe };
    const analyticsBus: AnalyticsEventBus = productionBus;

    await analyticsBus.publish('event.type', { id: 'evt-1' }, { source: 'test' });
    expect(productionBus.publish).toBeDefined();
  });

  it('loads both interface modules successfully at runtime', async () => {
    const productionModule = await import('./IEventBus');
    const analyticsModule = await import('../../../../analytics-service/src/domain/interfaces/IEventBus');

    expect(productionModule).toBeDefined();
    expect(analyticsModule).toBeDefined();
  });
});
