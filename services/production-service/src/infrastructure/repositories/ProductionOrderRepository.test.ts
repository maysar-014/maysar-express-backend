import { ProductionOrder, ProductionOrderStatus, ProductionPhase } from '../../domain/entities/ProductionOrder.entity';
import { ProductionSchedule } from '../../domain/value-objects/production-schedule.value-object';
import { ProductionOrderRepository } from './ProductionOrderRepository';

describe('ProductionOrderRepository', () => {
  const schedule = new ProductionSchedule({
    startTime: new Date('2026-01-01T08:00:00.000Z'),
    endTime: new Date('2026-01-01T12:00:00.000Z')
  });

  const createOrder = () =>
    new ProductionOrder({
      id: 'po-1',
      planId: 'plan-1',
      productId: 'prod-1',
      quantity: 100,
      producedQty: 0,
      defectedQty: 0,
      status: ProductionOrderStatus.PENDING,
      phase: ProductionPhase.PLANNING,
      schedule,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });

  it('saves and maps production orders through prisma delegate', async () => {
    const record = {
      id: 'po-1',
      planId: 'plan-1',
      productId: 'prod-1',
      quantity: 100,
      producedQty: 0,
      defectedQty: 0,
      status: ProductionOrderStatus.PENDING,
      phase: ProductionPhase.PLANNING,
      scheduledStart: new Date('2026-01-01T08:00:00.000Z'),
      scheduledEnd: new Date('2026-01-01T12:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    const delegate = {
      upsert: jest.fn().mockResolvedValue(record),
      findUnique: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue([record]),
      update: jest.fn().mockResolvedValue(record)
    };
    const repository = new ProductionOrderRepository({ production_Order: delegate } as never);

    const saved = await repository.save(createOrder());
    const byId = await repository.findById('po-1');
    const byPlan = await repository.findByPlanId('plan-1');
    await repository.updateStatus('po-1', ProductionOrderStatus.SCHEDULED);

    expect(delegate.upsert).toHaveBeenCalledTimes(1);
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 'po-1' } });
    expect(delegate.findMany).toHaveBeenCalledWith({ where: { planId: 'plan-1' } });
    expect(delegate.update).toHaveBeenCalledWith({ where: { id: 'po-1' }, data: { status: ProductionOrderStatus.SCHEDULED } });
    expect(saved.id).toBe('po-1');
    expect(byId?.status).toBe(ProductionOrderStatus.PENDING);
    expect(byPlan).toHaveLength(1);
  });

  it('supports fallback delegate name and throws when delegate is missing', async () => {
    const record = {
      id: 'po-1',
      planId: 'plan-1',
      productId: 'prod-1',
      quantity: 100,
      producedQty: 0,
      defectedQty: 0,
      status: ProductionOrderStatus.PENDING,
      phase: ProductionPhase.PLANNING,
      scheduledStart: new Date('2026-01-01T08:00:00.000Z'),
      scheduledEnd: new Date('2026-01-01T12:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    };
    const fallbackDelegate = {
      upsert: jest.fn().mockResolvedValue(record),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(record)
    };
    const fallbackRepo = new ProductionOrderRepository({ productionOrder: fallbackDelegate } as never);
    await expect(fallbackRepo.save(createOrder())).resolves.toBeInstanceOf(ProductionOrder);
    await expect(fallbackRepo.findById('missing')).resolves.toBeNull();

    const brokenRepo = new ProductionOrderRepository({} as never);
    await expect(brokenRepo.findById('x')).rejects.toThrow('Production order delegate is not configured on prisma client');
  });
});
