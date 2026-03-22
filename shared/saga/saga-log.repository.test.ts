export {};

import { PrismaSagaLogRepository } from './saga-log.repository';
import { SagaStatus, SagaStepStatus } from './saga.log';

type PrismaMock = {
  sagaLog: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  sagaStepLog: {
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
};

const createPrismaMock = (): PrismaMock => ({
  sagaLog: {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([])
  },
  sagaStepLog: {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findMany: jest.fn().mockResolvedValue([])
  }
});

describe('PrismaSagaLogRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves saga entry using default prisma client', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);

    await repository.save({
      sagaId: 's1',
      sagaType: 'OrderSaga',
      status: SagaStatus.STARTED,
      currentStep: 'START',
      payload: { orderId: 'o1' },
      context: { correlationId: 'c1' },
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    });

    expect(prisma.sagaLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sagaId: 's1',
          sagaType: 'OrderSaga',
          status: SagaStatus.STARTED
        })
      })
    );
  });

  it('supports transaction client in save/update/saveStep/updateStep', async () => {
    const prisma = createPrismaMock();
    const tx = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);

    await repository.save(
      {
        sagaId: 's2',
        sagaType: 'OrderSaga',
        status: SagaStatus.STARTED,
        currentStep: 'A',
        payload: {},
        context: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      tx as any
    );
    await repository.update('s2', { status: SagaStatus.IN_PROGRESS, currentStep: 'B' }, tx as any);
    await repository.saveStep(
      {
        id: 'step-1',
        sagaId: 's2',
        stepName: 'B',
        status: SagaStepStatus.STARTED,
        startedAt: new Date()
      },
      tx as any
    );
    await repository.updateStep('step-1', { status: SagaStepStatus.COMPLETED }, tx as any);

    expect(tx.sagaLog.create).toHaveBeenCalled();
    expect(tx.sagaLog.update).toHaveBeenCalled();
    expect(tx.sagaStepLog.create).toHaveBeenCalled();
    expect(tx.sagaStepLog.update).toHaveBeenCalled();
  });

  it('updates only provided fields and always updates timestamp', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);

    await repository.update('s3', {
      sagaType: 'UpdatedSaga',
      status: SagaStatus.FAILED,
      currentStep: 'rollback',
      payload: { x: 1 },
      context: { y: 2 },
      error: 'boom'
    });

    expect(prisma.sagaLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sagaId: 's3' },
        data: expect.objectContaining({
          sagaType: 'UpdatedSaga',
          status: SagaStatus.FAILED,
          currentStep: 'rollback',
          payload: { x: 1 },
          context: { y: 2 },
          error: 'boom',
          updatedAt: expect.any(Date)
        })
      })
    );
  });

  it('maps getById null and non-null records', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);

    prisma.sagaLog.findUnique.mockResolvedValueOnce(null);
    expect(await repository.getById('missing')).toBeNull();

    prisma.sagaLog.findUnique.mockResolvedValueOnce({
      sagaId: 's4',
      sagaType: 'OrderSaga',
      status: SagaStatus.COMPENSATING,
      currentStep: 'pay',
      payload: { orderId: 'o4' },
      context: { correlationId: 'c4' },
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:01:00.000Z'),
      error: 'error msg'
    });
    const result = await repository.getById('s4');

    expect(result).toEqual(
      expect.objectContaining({
        sagaId: 's4',
        status: SagaStatus.COMPENSATING,
        error: 'error msg'
      })
    );
  });

  it('maps getSteps with status casting and nullable fields', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);
    prisma.sagaStepLog.findMany.mockResolvedValue([
      {
        id: 'st1',
        sagaId: 's5',
        stepName: 'reserve',
        status: 'STARTED',
        startedAt: new Date('2026-03-08T00:00:00.000Z'),
        completedAt: null,
        error: null
      },
      {
        id: 'st2',
        sagaId: 's5',
        stepName: 'pay',
        status: 'FAILED',
        startedAt: new Date('2026-03-08T00:01:00.000Z'),
        completedAt: new Date('2026-03-08T00:02:00.000Z'),
        error: 'payment failed'
      }
    ]);

    const steps = await repository.getSteps('s5');

    expect(prisma.sagaStepLog.findMany).toHaveBeenCalledWith({
      where: { sagaId: 's5' },
      orderBy: { startedAt: 'asc' }
    });
    expect(steps).toEqual([
      expect.objectContaining({ id: 'st1', status: 'STARTED', completedAt: undefined }),
      expect.objectContaining({ id: 'st2', status: 'FAILED', error: 'payment failed' })
    ]);
  });

  it('finds stuck sagas older than cutoff and maps results', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);
    prisma.sagaLog.findMany.mockResolvedValue([
      {
        sagaId: 's6',
        sagaType: 'OrderSaga',
        status: SagaStatus.IN_PROGRESS,
        currentStep: 'pay',
        payload: {},
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 60000),
        error: null
      }
    ]);

    const result = await repository.findStuck([SagaStatus.STARTED, SagaStatus.IN_PROGRESS], 30000, ['OrderSaga']);

    expect(prisma.sagaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [SagaStatus.STARTED, SagaStatus.IN_PROGRESS] },
          updatedAt: { lt: expect.any(Date) },
          sagaType: { in: ['OrderSaga'] }
        }),
        orderBy: { updatedAt: 'asc' }
      })
    );
    expect(result[0]).toEqual(expect.objectContaining({ sagaId: 's6' }));
  });

  it('returns no stuck sagas without querying when saga type filter is empty', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaSagaLogRepository(prisma as any);

    const result = await repository.findStuck([SagaStatus.STARTED], 30000, []);

    expect(prisma.sagaLog.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
