import { Prisma } from '@prisma/client';
import { FraudAssessment } from '../../../domain/engines/fraud.engine';
import { FraudRepository } from '../fraud.repository';

interface MockPaymentDelegate {
  findMany: jest.Mock;
  aggregate: jest.Mock;
}

interface MockFraudAssessmentDelegate {
  create: jest.Mock;
  findMany: jest.Mock;
  upsert: jest.Mock;
  findUnique: jest.Mock;
}

interface MockPrisma {
  payment?: MockPaymentDelegate;
  fraudAssessment?: MockFraudAssessmentDelegate;
}

function createRepository() {
  const payment: MockPaymentDelegate = {
    findMany: jest.fn(),
    aggregate: jest.fn()
  };

  const fraudAssessment: MockFraudAssessmentDelegate = {
    create: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    findUnique: jest.fn()
  };

  const prisma: MockPrisma = {
    payment,
    fraudAssessment
  };

  return {
    repository: new FraudRepository(prisma),
    payment,
    fraudAssessment
  };
}

describe('FraudRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps recent transactions metadata and applies safe defaults', async () => {
    const { repository, payment } = createRepository();
    const createdAt = new Date('2026-03-08T10:00:00.000Z');

    payment.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        userId: 'user-1',
        amount: '125.5',
        currency: 'USD',
        method: 'CARD',
        metadata: {
          ipAddress: '10.10.1.8',
          deviceFingerprint: 'fp-1'
        },
        createdAt
      },
      {
        id: 'tx-2',
        userId: 'user-1',
        amount: new Prisma.Decimal('19.9'),
        currency: 'USD',
        method: 'MOBILE',
        metadata: null,
        createdAt
      }
    ]);

    const result = await repository.getRecentTransactions('user-1', 600);

    expect(payment.findMany).toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        transactionId: 'tx-1',
        amount: 125.5,
        ipAddress: '10.10.1.8',
        deviceFingerprint: 'fp-1'
      }),
      expect.objectContaining({
        transactionId: 'tx-2',
        amount: 19.9,
        ipAddress: '0.0.0.0',
        deviceFingerprint: 'unknown'
      })
    ]);
  });

  it('returns average profile amount with null-safe conversion', async () => {
    const { repository, payment } = createRepository();
    payment.aggregate.mockResolvedValue({ _avg: { amount: null } });

    const profile = await repository.getUserProfile('user-1');

    expect(profile).toEqual({ averageTransaction: 0 });
  });

  it('computes rounded device reputation from linked assessments', async () => {
    const { repository, payment, fraudAssessment } = createRepository();
    payment.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
    fraudAssessment.findMany.mockResolvedValue([{ riskScore: 41 }, { riskScore: 60 }]);

    const score = await repository.getDeviceReputation('fingerprint-1');

    expect(score).toEqual({ riskScore: 51 });
    expect(fraudAssessment.findMany).toHaveBeenCalledWith({
      where: {
        transactionId: { in: ['p-1', 'p-2'] }
      }
    });
  });

  it('stores legacy result using upsert and sensible defaults', async () => {
    const { repository, fraudAssessment } = createRepository();
    fraudAssessment.upsert.mockResolvedValue({});

    await repository.saveResult('payment-9', { score: 87, level: 'HIGH' });

    expect(fraudAssessment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId: 'payment-9' },
        create: expect.objectContaining({
          transactionId: 'payment-9',
          riskScore: 87,
          riskLevel: 'HIGH'
        })
      })
    );
  });

  it('throws explicit errors when prisma delegates are missing', async () => {
    const repositoryWithoutPayment = new FraudRepository({});
    await expect(repositoryWithoutPayment.getUserProfile('user-1')).rejects.toThrow(
      'Payment delegate is not configured on prisma client'
    );

    const repositoryWithoutFraud = new FraudRepository({
      payment: {
        findMany: jest.fn(),
        aggregate: jest.fn()
      }
    });
    const assessment: FraudAssessment = {
      transactionId: 'tx-77',
      riskScore: 12,
      riskLevel: 'low',
      recommendation: 'approve',
      confidence: 95,
      flags: [],
      processingTime: 8
    };

    await expect(repositoryWithoutFraud.saveAssessment(assessment)).rejects.toThrow(
      'Fraud assessment delegate is not configured on prisma client'
    );
  });
});
