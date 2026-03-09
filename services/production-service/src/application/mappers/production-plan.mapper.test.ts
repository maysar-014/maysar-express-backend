import { ProductionPlanMapper } from './production-plan.mapper';

describe('ProductionPlanMapper', () => {
  it('maps production plan entity to dto', () => {
    const plan = {
      id: 'plan-1',
      supplierId: 'supplier-1',
      name: 'March Plan',
      status: 'SCHEDULED',
      priority: 'HIGH',
      targetQuantity: 1000,
      actualQuantity: 100,
      schedule: {
        startTime: new Date('2026-03-10T00:00:00.000Z'),
        endTime: new Date('2026-03-20T00:00:00.000Z')
      }
    };

    const dto = ProductionPlanMapper.toDto(plan as never);

    expect(dto.id).toBe('plan-1');
    expect(dto.startDate).toBe('2026-03-10T00:00:00.000Z');
    expect(dto.endDate).toBe('2026-03-20T00:00:00.000Z');
    expect(dto.targetQuantity).toBe(1000);
  });
});
