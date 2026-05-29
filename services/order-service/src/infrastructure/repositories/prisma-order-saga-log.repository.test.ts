import { PrismaOrderSagaLogRepository } from './prisma-order-saga-log.repository';
import { SagaStatus, SagaStepStatus, type SagaLogEntry, type SagaStepLog } from '@shared/saga/saga.log';

const buildPrismaMock = () => ({
  order_SagaLog: {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  order_SagaStepLog: {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findMany: jest.fn(),
  },
});

describe('PrismaOrderSagaLogRepository', () => {
  it('saves, updates, and reads saga logs', async () => {
    const prisma = buildPrismaMock();
    prisma.order_SagaLog.findUnique.mockResolvedValue({
      sagaId: 'saga-1',
      sagaType: 'ORDER_FULFILLMENT',
      status: 'IN_PROGRESS',
      currentStep: 'PAYMENT',
      payload: { orderId: 'order-1' },
      context: { source: 'checkout' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      error: null,
    });
    prisma.order_SagaLog.findMany.mockResolvedValue([]);
    prisma.order_SagaStepLog.findMany.mockResolvedValue([]);

    const repository = new PrismaOrderSagaLogRepository(prisma as never);
    const entry: SagaLogEntry = {
      sagaId: 'saga-1',
      sagaType: 'ORDER_FULFILLMENT',
      status: SagaStatus.STARTED,
      currentStep: 'INIT',
      payload: { orderId: 'order-1' },
      context: { source: 'checkout' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    await repository.save(entry);
    await repository.update('saga-1', { status: SagaStatus.IN_PROGRESS, error: 'retry' });

    const found = await repository.getById('saga-1');

    expect(prisma.order_SagaLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sagaId: 'saga-1',
        payload: { orderId: 'order-1' },
        context: { source: 'checkout' },
      }),
    });
    expect(prisma.order_SagaLog.update).toHaveBeenCalledWith({
      where: { sagaId: 'saga-1' },
      data: expect.objectContaining({
        status: SagaStatus.IN_PROGRESS,
        error: 'retry',
      }),
    });
    expect(found).toMatchObject({
      sagaId: 'saga-1',
      sagaType: 'ORDER_FULFILLMENT',
      status: SagaStatus.IN_PROGRESS,
    });
  });

  it('saves steps, updates them, and finds stuck sagas', async () => {
    const prisma = buildPrismaMock();
    prisma.order_SagaLog.findMany.mockResolvedValue([
      {
        sagaId: 'saga-1',
        sagaType: 'ORDER_FULFILLMENT',
        status: 'FAILED',
        currentStep: 'PAYMENT',
        payload: {},
        context: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        error: 'boom',
      },
    ]);
    prisma.order_SagaStepLog.findMany.mockResolvedValue([
      {
        id: 'step-1',
        sagaId: 'saga-1',
        stepName: 'PAYMENT',
        status: 'STARTED',
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        completedAt: null,
        error: null,
      },
    ]);

    const repository = new PrismaOrderSagaLogRepository(prisma as never);
    const step: SagaStepLog = {
      id: 'step-1',
      sagaId: 'saga-1',
      stepName: 'PAYMENT',
      status: SagaStepStatus.STARTED,
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    await repository.saveStep(step);
    await repository.updateStep('step-1', { status: SagaStepStatus.COMPLETED, completedAt: new Date('2026-01-02T00:00:00.000Z') });
    const steps = await repository.getSteps('saga-1');
    const stuck = await repository.findStuck([SagaStatus.FAILED], 24 * 60 * 60 * 1000, ['ORDER_FULFILLMENT']);

    expect(prisma.order_SagaStepLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'step-1',
        sagaId: 'saga-1',
      }),
    });
    expect(prisma.order_SagaStepLog.update).toHaveBeenCalledWith({
      where: { id: 'step-1' },
      data: expect.objectContaining({
        status: SagaStepStatus.COMPLETED,
      }),
    });
    expect(steps).toHaveLength(1);
    expect(stuck).toHaveLength(1);
  });
});
