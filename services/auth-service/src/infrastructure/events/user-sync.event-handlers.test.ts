const mockSubscribe = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    subscribe: mockSubscribe
  }
}));

jest.mock('../services/logger.service', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError
  }
}));

jest.mock('@prisma/client', () => ({
  Auth_UserRole: {
    BUYER: 'BUYER',
    SELLER: 'SELLER',
    SUPPLIER: 'SUPPLIER',
    COURIER: 'COURIER',
    ENABLER: 'ENABLER',
    SYSTEM: 'SYSTEM'
  },
  Auth_UserStatus: {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DEACTIVATED: 'DEACTIVATED',
    LOCKED: 'LOCKED',
    PENDING_VERIFICATION: 'PENDING_VERIFICATION'
  }
}));

import { UserSyncEventHandlers } from './user-sync.event-handlers';

describe('UserSyncEventHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all user sync event subscriptions', () => {
    const repository = { user: {} } as never;
    const handlers = new UserSyncEventHandlers(repository);

    handlers.registerHandlers();

    expect(mockSubscribe).toHaveBeenCalledTimes(6);
    expect(mockSubscribe).toHaveBeenCalledWith(
      'UserRegistered',
      expect.objectContaining({ name: 'auth-user-sync-registered' })
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith('Auth user sync handlers registered');
  });

  it('upserts and updates auth users from user events', async () => {
    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
      }
    };
    const handlers = new UserSyncEventHandlers(prisma as never);

    await (handlers as any).handleUserRegistered({
      aggregateId: 'user-1',
      email: 'Buyer@Example.com',
      role: 'buyer',
      publicCode: 'MSR-1001'
    });
    await (handlers as any).handleUserEmailVerified({
      aggregateId: 'user-1',
      email: 'Buyer@Example.com'
    });
    await (handlers as any).handleUserPhoneVerified({
      aggregateId: 'user-1',
      phoneNumber: '+255700000001'
    });
    await (handlers as any).handleUserRoleChanged({
      aggregateId: 'user-1',
      newRole: 'seller'
    });
    await (handlers as any).handleUserStatusChanged({
      aggregateId: 'user-1',
      newStatus: 'active'
    });
    await (handlers as any).handleUserProfileUpdated({
      aggregateId: 'user-1',
      changes: ['email', 'phoneNumber'],
      newValues: {
        email: 'NewBuyer@Example.com',
        phoneNumber: '+255700000002'
      }
    });

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        create: expect.objectContaining({
          email: 'buyer@example.com',
          publicCode: 'MSR-1001',
          role: 'BUYER',
          status: 'PENDING_VERIFICATION'
        }),
        update: expect.objectContaining({
          email: 'buyer@example.com',
          role: 'BUYER',
          status: 'PENDING_VERIFICATION',
          publicCode: 'MSR-1001'
        })
      })
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isEmailVerified: true,
          email: 'buyer@example.com'
        })
      })
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          isPhoneVerified: true,
          phoneNumber: '+255700000001'
        })
      })
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'SELLER'
        })
      })
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACTIVE'
        })
      })
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'newbuyer@example.com',
          phoneNumber: '+255700000002'
        })
      })
    );
  });
});
