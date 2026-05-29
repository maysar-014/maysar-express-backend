const mockSubscribe = jest.fn();
const mockPublish = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('../../../../../shared/events/eventBus', () => ({
  eventBus: {
    subscribe: mockSubscribe,
    publish: mockPublish
  }
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    debug: mockLoggerDebug
  }
}));

jest.mock('../../infrastructure/database/prisma-client', () => ({
  prisma: {
    notification: {
      create: jest.fn()
    }
  }
}));

jest.mock('../../infrastructure/repositories/prisma-kyc.repository', () => ({
  PrismaKycRepository: jest.fn().mockImplementation(() => ({
    findUserSnapshot: jest.fn(),
    getAggregatedUserData: jest.fn(),
    createAuditLog: jest.fn()
  }))
}));

jest.mock('../../domain/services/kyc-evaluation.service', () => ({
  KycEvaluationService: jest.fn().mockImplementation(() => ({
    evaluateKycRequirement: jest.fn()
  }))
}));

jest.mock('@prisma/client', () => ({
  Prisma: {
    InputJsonValue: class {}
  }
}));

import { prisma } from '../../infrastructure/database/prisma-client';
import { KycEventSubscriber } from './kyc-event-subscriber';

describe('KycEventSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers subscriptions for all tracked event types', async () => {
    const repository = {
      findUserSnapshot: jest.fn(),
      getAggregatedUserData: jest.fn(),
      createAuditLog: jest.fn()
    } as any;
    const evaluationService = {
      evaluateKycRequirement: jest.fn()
    } as any;
    const subscriber = new KycEventSubscriber(repository, evaluationService);

    await subscriber.register();

    expect(mockSubscribe).toHaveBeenCalledTimes(19);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'KYC event subscriber registered',
      { eventTypes: 19 }
    );
  });

  it('creates audit logs, notifications, and publishes level requirements when triggered', async () => {
    const notificationCreate = (prisma.notification.create as jest.Mock);
    const repository = {
      findUserSnapshot: jest.fn().mockResolvedValue({
        userId: 'user-1',
        kycStatus: 'none',
        kycLevel: 1
      }),
      getAggregatedUserData: jest.fn().mockResolvedValue({
        userId: 'user-1',
        role: 'buyer',
        totalOrders: 2,
        totalListings: 0,
        walletBalance: 1000,
        totalTransactions: 3,
        currentKycLevel: 1
      }),
      createAuditLog: jest.fn().mockResolvedValue(undefined)
    } as any;
    const evaluationService = {
      evaluateKycRequirement: jest.fn().mockReturnValue('LEVEL_2_REQUIRED')
    } as any;
    const subscriber = new KycEventSubscriber(repository, evaluationService);

    await (subscriber as any).handleEnvelope('OrderCompleted', { userId: 'user-1' });

    expect(repository.findUserSnapshot).toHaveBeenCalledWith('user-1');
    expect(repository.getAggregatedUserData).toHaveBeenCalledWith('user-1');
    expect(repository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        newLevel: 2,
        newStatus: 'pending'
      })
    );
    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          subject: 'Complete Verification'
        })
      })
    );
    expect(mockPublish).toHaveBeenCalledWith(
      'kyc.level_required',
      expect.objectContaining({
        userId: 'user-1',
        trigger: 'LEVEL_2_REQUIRED',
        kycLevel: 2
      })
    );
  });
});
