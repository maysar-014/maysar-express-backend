import { ProductionOrder, ProductionOrderStatus, ProductionPhase } from './ProductionOrder.entity';
import { ProductionSchedule } from '../value-objects/production-schedule.value-object';

describe('ProductionOrder', () => {
  const schedule = new ProductionSchedule({
    startTime: new Date('2026-01-01T08:00:00.000Z'),
    endTime: new Date('2026-01-01T12:00:00.000Z')
  });

  const createOrder = (status: ProductionOrderStatus = ProductionOrderStatus.PENDING) =>
    new ProductionOrder({
      id: 'po-1',
      planId: 'plan-1',
      productId: 'prod-1',
      quantity: 100,
      producedQty: 0,
      defectedQty: 0,
      status,
      phase: ProductionPhase.PLANNING,
      schedule,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });

  it('starts production from pending or scheduled states', () => {
    const pending = createOrder(ProductionOrderStatus.PENDING);
    pending.startProduction();
    expect(pending.status).toBe(ProductionOrderStatus.IN_PROGRESS);
    expect(pending.phase).toBe(ProductionPhase.PREPARATION);
    expect(pending.actualStart).toBeInstanceOf(Date);

    const scheduled = createOrder(ProductionOrderStatus.SCHEDULED);
    expect(() => scheduled.startProduction()).not.toThrow();
  });

  it('completes and fails production with metadata updates', () => {
    const order = createOrder(ProductionOrderStatus.SCHEDULED);
    order.startProduction();
    order.completeProduction(95, 5);

    expect(order.status).toBe(ProductionOrderStatus.COMPLETED);
    expect(order.phase).toBe(ProductionPhase.COMPLETED);
    expect(order.producedQty).toBe(95);
    expect(order.defectedQty).toBe(5);
    expect(order.actualEnd).toBeInstanceOf(Date);

    const failed = createOrder(ProductionOrderStatus.IN_PROGRESS);
    failed.failProduction('machine failure');
    expect(failed.status).toBe(ProductionOrderStatus.FAILED);
  });

  it('rejects invalid start transition', () => {
    const order = createOrder(ProductionOrderStatus.COMPLETED);
    expect(() => order.startProduction()).toThrow('Order must be scheduled or pending to start');
  });
});
