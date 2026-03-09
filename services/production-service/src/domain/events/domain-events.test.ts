import type {
  ProductionCompletedEvent,
  ProductionScheduledEvent,
  QualityCheckFailedEvent
} from './domain-events';

describe('production domain events', () => {
  it('supports scheduled/completed/quality-failed event contracts', () => {
    const scheduled: ProductionScheduledEvent = {
      type: 'ProductionScheduled',
      payload: { orderId: 'order-1', timestamp: new Date('2026-03-08T00:00:00.000Z') }
    };
    const completed: ProductionCompletedEvent = {
      type: 'ProductionCompleted',
      payload: { orderId: 'order-1', producedQty: 100, timestamp: new Date('2026-03-09T00:00:00.000Z') }
    };
    const failed: QualityCheckFailedEvent = {
      type: 'QualityCheckFailed',
      payload: { orderId: 'order-1', reason: 'defect threshold', timestamp: new Date('2026-03-09T01:00:00.000Z') }
    };

    expect(scheduled.type).toBe('ProductionScheduled');
    expect(completed.payload.producedQty).toBe(100);
    expect(failed.payload.reason).toBe('defect threshold');
  });
});
