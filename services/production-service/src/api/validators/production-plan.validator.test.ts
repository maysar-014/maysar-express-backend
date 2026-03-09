import { createProductionPlanSchema, updateProductionStatusSchema } from './production-plan.validator';
import { ProductionPriority } from '../../domain/entities/ProductionPlan.entity';

describe('production-plan.validator', () => {
  it('accepts valid create and update payloads', () => {
    const createPayload = {
      body: {
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Plan Name',
        targetQuantity: 100,
        startDate: '2026-03-10T00:00:00.000Z',
        endDate: '2026-03-11T00:00:00.000Z',
        priority: ProductionPriority.MEDIUM
      }
    };
    const updatePayload = {
      params: { id: '550e8400-e29b-41d4-a716-446655440001' },
      body: { status: 'IN_PROGRESS' }
    };

    expect(createProductionPlanSchema.parse(createPayload).body.name).toBe('Plan Name');
    expect(updateProductionStatusSchema.parse(updatePayload).body.status).toBe('IN_PROGRESS');
  });

  it('rejects invalid payloads', () => {
    expect(() =>
      createProductionPlanSchema.parse({
        body: { supplierId: 'bad', name: 'x', targetQuantity: -1, startDate: 'bad', endDate: 'bad' }
      })
    ).toThrow();
  });
});
