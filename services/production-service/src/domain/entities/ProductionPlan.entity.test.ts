import { ProductionPlan, ProductionPriority, ProductionStatus } from './ProductionPlan.entity';
import { ProductionSchedule } from '../value-objects/production-schedule.value-object';

describe('ProductionPlan', () => {
  const schedule = new ProductionSchedule({
    startTime: new Date('2026-01-01T08:00:00.000Z'),
    endTime: new Date('2026-01-01T16:00:00.000Z')
  });

  const createPlan = (status: ProductionStatus = ProductionStatus.DRAFT) =>
    new ProductionPlan({
      id: 'plan-1',
      supplierId: 'sup-1',
      name: 'Plan A',
      status,
      priority: ProductionPriority.HIGH,
      schedule,
      targetQuantity: 200,
      actualQuantity: 0,
      version: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });

  it('updates status with completion guard', () => {
    const plan = createPlan();
    plan.updateStatus(ProductionStatus.SCHEDULED);
    expect(plan.status).toBe(ProductionStatus.SCHEDULED);

    const completed = createPlan(ProductionStatus.COMPLETED);
    expect(() => completed.updateStatus(ProductionStatus.IN_PROGRESS)).toThrow('Cannot change status of completed plan');
  });

  it('updates progress only when in progress', () => {
    const plan = createPlan(ProductionStatus.IN_PROGRESS);
    plan.updateProgress(120);
    expect(plan.actualQuantity).toBe(120);

    const draft = createPlan(ProductionStatus.DRAFT);
    expect(() => draft.updateProgress(50)).toThrow('Cannot update progress if plan is not in progress');
  });

  it('serializes to JSON with schedule fields', () => {
    const plan = createPlan(ProductionStatus.COMPLETED);
    expect(plan.isCompleted()).toBe(true);

    const json = plan.toJSON();
    expect(json).toEqual(
      expect.objectContaining({
        id: 'plan-1',
        schedule: expect.objectContaining({
          startTime: new Date('2026-01-01T08:00:00.000Z'),
          endTime: new Date('2026-01-01T16:00:00.000Z')
        })
      })
    );
  });
});
