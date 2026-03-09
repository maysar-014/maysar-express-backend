import {
  ProductionPriority,
  ProductionStatus
} from '../../domain/entities/ProductionPlan.entity';
import type {
  CreateProductionPlanDto,
  ProductionPlanResponseDto,
  UpdateProductionPlanDto
} from './production-plan.dto';

describe('production-plan DTO contracts', () => {
  it('supports create and update production-plan payloads', () => {
    const createDto: CreateProductionPlanDto = {
      supplierId: 'supplier-1',
      name: 'March Plan',
      description: 'Increase textile output',
      targetQuantity: 5000,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      priority: ProductionPriority.HIGH
    };
    const updateDto: UpdateProductionPlanDto = {
      status: ProductionStatus.IN_PROGRESS,
      targetQuantity: 5200
    };

    expect(createDto.priority).toBe(ProductionPriority.HIGH);
    expect(updateDto.status).toBe(ProductionStatus.IN_PROGRESS);
  });

  it('supports production-plan response payload shape', () => {
    const response: ProductionPlanResponseDto = {
      id: 'plan-1',
      supplierId: 'supplier-1',
      name: 'March Plan',
      status: ProductionStatus.SCHEDULED,
      priority: ProductionPriority.MEDIUM,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      targetQuantity: 5000,
      actualQuantity: 0,
      createdAt: '2026-02-20T00:00:00.000Z',
      updatedAt: '2026-02-20T00:00:00.000Z'
    };

    expect(response.status).toBe(ProductionStatus.SCHEDULED);
    expect(response.targetQuantity).toBe(5000);
  });
});
