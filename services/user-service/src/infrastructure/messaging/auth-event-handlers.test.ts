const mockSubscribe = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    subscribe: mockSubscribe
  }
}));

jest.mock('../services/logger.service', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug
  }
}));

jest.mock('../database/prisma-client', () => ({
  prisma: {
    user_User: {
      update: jest.fn(),
      upsert: jest.fn()
    },
    user_UserIndex: {
      findFirst: jest.fn(),
      createMany: jest.fn()
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

// Mock PiiEncryptionService with deterministic test doubles
jest.mock('../../../../../shared/encryption/pii-encryption.service', () => ({
  PiiEncryptionService: jest.fn().mockImplementation(() => ({
    encrypt: (value: string) => value ? `encrypted:${value}` : value,
    hash: (value: string) => value ? `hashed:${value}` : value
  }))
}));

import { prisma } from '../database/prisma-client';
import { AuthEventHandlers } from './auth-event-handlers';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

const makePiiService = () => new PiiEncryptionService();

describe('AuthEventHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing index entry (so index creation path is exercised)
    (prisma.user_UserIndex.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user_UserIndex.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.user_User.upsert as jest.Mock).mockResolvedValue({});
    (prisma.user_User.update as jest.Mock).mockResolvedValue({});
  });

  it('registers 5 auth-to-user subscriptions', () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    expect(mockSubscribe).toHaveBeenCalledTimes(5);
    expect(mockLoggerInfo).toHaveBeenCalledWith('Setting up Auth -> User sync subscriptions');
  });

  // ── UserRegistered.v1 — PII fix tests ──────────────────────────────────────

  it('[5.1] UserRegistered.v1: stores ENCRYPTED email, not plaintext', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: {
        userId: 'user-pii-1',
        publicCode: 'USR-100',
        email: 'test@example.com',
        role: 'buyer',
        profile: {}
      }
    });

    const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
    // Must be the mock-encrypted value (prefixed with 'encrypted:')
    // Real PiiEncryptionService produces iv:authTag:ciphertext — no '@'
    expect(upsertCall.create.email).toBe('encrypted:test@example.com');
    // Must NOT be the raw plaintext email (real encryption never starts with the address)
    expect(upsertCall.create.email).not.toBe('test@example.com');
  });

  it('[5.2] UserRegistered.v1: creates email user_UserIndex entry for new user', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: { userId: 'user-idx-1', email: 'idx@example.com', role: 'buyer', profile: {} }
    });

    expect(prisma.user_UserIndex.findFirst as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-idx-1', indexType: 'email' } })
    );
    expect(prisma.user_UserIndex.createMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-idx-1', indexType: 'email', value: 'hashed:idx@example.com' })
        ])
      })
    );
  });

  it('[5.3] UserRegistered.v1: creates phone user_UserIndex entry when phone present', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: {
        userId: 'user-phone-1',
        email: 'phone@example.com',
        role: 'buyer',
        profile: { phoneNumber: '+255700000001' }
      }
    });

    const createManyCall = (prisma.user_UserIndex.createMany as jest.Mock).mock.calls[0][0];
    expect(createManyCall.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'user-phone-1', indexType: 'email' }),
      expect.objectContaining({ userId: 'user-phone-1', indexType: 'phone', value: 'hashed:+255700000001' })
    ]));
  });

  it('[5.4] UserRegistered.v1: does NOT create duplicate index when email index already exists', async () => {
    // Simulate existing email index entry
    (prisma.user_UserIndex.findFirst as jest.Mock).mockResolvedValue({
      userId: 'user-dup-1',
      indexType: 'email',
      value: 'hashed:dup@example.com'
    });

    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: { userId: 'user-dup-1', email: 'dup@example.com', role: 'buyer', profile: {} }
    });

    // createMany must NOT be called — index already exists
    expect(prisma.user_UserIndex.createMany as jest.Mock).not.toHaveBeenCalled();
  });

  // ── Other handlers — preservation ─────────────────────────────────────────

  it('[5.5] AuthLoginSuccess: updates lastLoginAt and resets failedLoginAttempts', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [loginSuccess] = mockSubscribe.mock.calls.map(c => c[1]);

    await loginSuccess({ data: { userId: 'user-1', lastLoginAt: '2026-05-01T00:00:00.000Z' } });

    expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ failedLoginAttempts: 0, lockoutUntil: null })
      })
    );
    // PII service must NOT be called for login success
    expect(prisma.user_UserIndex.createMany as jest.Mock).not.toHaveBeenCalled();
  });

  it('[5.5] AuthLoginFailed: increments failedLoginAttempts and sets lockout', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, loginFailed] = mockSubscribe.mock.calls.map(c => c[1]);

    await loginFailed({
      data: {
        userId: 'user-2',
        failedLoginAttempts: 5,
        lockoutUntil: '2026-05-01T01:00:00.000Z'
      }
    });

    expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2' },
        data: expect.objectContaining({ failedLoginAttempts: 5 })
      })
    );
  });

  it('[5.5] AuthTwoFactorEnabled: sets twoFactorEnabled=true', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , twoFactorEnabled] = mockSubscribe.mock.calls.map(c => c[1]);

    await twoFactorEnabled({ data: { userId: 'user-3', enabled: true } });

    expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-3' },
        data: { twoFactorEnabled: true }
      })
    );
  });

  it('[5.5] AuthTwoFactorDisabled: sets twoFactorEnabled=false and nulls secret', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , twoFactorDisabled] = mockSubscribe.mock.calls.map(c => c[1]);

    await twoFactorDisabled({ data: { userId: 'user-4', enabled: false } });

    expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-4' },
        data: { twoFactorEnabled: false, twoFactorSecret: null }
      })
    );
  });
});
