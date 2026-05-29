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

jest.mock('../database/prisma-client', () => ({
  prisma: {
    user_User: {
      update: jest.fn(),
      upsert: jest.fn()
    }
  }
}));

jest.mock('@prisma/client', () => ({
  User_UserRole: {
    BUYER: 'BUYER',
    SELLER: 'SELLER',
    SUPPLIER: 'SUPPLIER',
    COURIER: 'COURIER',
    ENABLER: 'ENABLER',
    SYSTEM: 'SYSTEM'
  },
  User_UserStatus: {
    LOCKED: 'LOCKED',
    PENDING_VERIFICATION: 'PENDING_VERIFICATION'
  }
}));

import { prisma } from '../database/prisma-client';
import { AuthEventHandlers } from './auth-event-handlers';

describe('AuthEventHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the expected auth-to-user subscriptions', () => {
    const handlers = new AuthEventHandlers();
    handlers.setupSubscriptions();

    expect(mockSubscribe).toHaveBeenCalledTimes(5);
    expect(mockLoggerInfo).toHaveBeenCalledWith('Setting up Auth -> User sync subscriptions');
  });

  it('translates auth events into user updates and upserts', async () => {
    const handlers = new AuthEventHandlers();
    const userUpdate = (prisma.user_User.update as jest.Mock);
    const userUpsert = (prisma.user_User.upsert as jest.Mock);

    await handlers.setupSubscriptions();

    const [loginSuccess, loginFailed, twoFactorEnabled, twoFactorDisabled, userRegistered] = mockSubscribe.mock.calls.map(
      (call) => call[1]
    );

    await loginSuccess({ data: { userId: 'user-1', lastLoginAt: '2026-05-01T00:00:00.000Z' } });
    await loginFailed({ data: { userId: 'user-1', failedLoginAttempts: 4, lockoutUntil: '2026-05-01T01:00:00.000Z' } });
    await twoFactorEnabled({ data: { userId: 'user-1', enabled: true } });
    await twoFactorDisabled({ data: { userId: 'user-1', enabled: false } });
    await userRegistered({
      data: {
        userId: 'user-2',
        publicCode: 'USR-200',
        email: 'NewUser@Example.com',
        role: 'seller',
        profile: {
          firstName: 'New',
          lastName: 'User',
          phoneNumber: '+255700000010'
        }
      }
    });

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockoutUntil: null
        })
      })
    );
    expect(userUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2' },
        create: expect.objectContaining({
          email: 'NewUser@Example.com',
          publicCode: 'USR-200'
        })
      })
    );
  });
});
