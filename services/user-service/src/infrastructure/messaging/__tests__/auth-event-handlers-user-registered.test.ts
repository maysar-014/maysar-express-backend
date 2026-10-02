/**
 * Auth Event Handlers — UserRegistered.v1 Bugfix Tests
 *
 * Spec: .kiro/specs/auth-user-sync-on-register
 *
 * Test structure follows the bug condition methodology:
 *   - Property 1 (Bug Condition): FAILS on unfixed code, PASSES after fix
 *   - Property 2 (Preservation): PASSES on both unfixed and fixed code
 */

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    subscribe: jest.fn()
  }
}));

jest.mock('../../database/prisma-client', () => ({
  prisma: {
    user_User: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    user_UserIndex: {
      findFirst: jest.fn(),
      createMany: jest.fn()
    }
  }
}));

jest.mock('../../services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Deterministic mock: encrypt prefixes 'enc:', hash prefixes 'h:'
jest.mock('../../../../../../shared/encryption/pii-encryption.service', () => ({
  PiiEncryptionService: jest.fn().mockImplementation(() => ({
    encrypt: (v: string) => v ? `enc:${v}` : v,
    hash: (v: string) => v ? `h:${v}` : v
  }))
}));

import { eventBus } from '@shared/events/eventBus';
import { prisma } from '../../database/prisma-client';
import { User_UserRole, User_UserStatus } from '@prisma/client';
import { AuthEventHandlers } from '../auth-event-handlers';
import { PiiEncryptionService } from '../../../../../../shared/encryption/pii-encryption.service';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockedEventBus = eventBus as unknown as { subscribe: jest.Mock };
const mockedPrisma = prisma as unknown as {
  user_User: { upsert: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
  user_UserIndex: { findFirst: jest.Mock; createMany: jest.Mock };
};

const makePiiService = () => new PiiEncryptionService();

/**
 * Retrieve the handler function registered for a given event type.
 * Returns undefined if no subscription was registered for that event.
 */
const getSubscribedHandler = (
  eventName: string
): ((envelope: unknown) => Promise<void>) | undefined => {
  const call = mockedEventBus.subscribe.mock.calls.find(
    (args: unknown[]) => args[0] === eventName
  );
  return call?.[1] as ((envelope: unknown) => Promise<void>) | undefined;
};

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const FULL_PAYLOAD = {
  userId: 'user-abc-123',
  publicCode: 'PUB-001',
  email: 'alice@example.com',
  role: 'buyer',
  profile: {
    firstName: 'Alice',
    lastName: 'Smith',
    phoneNumber: '+255700000001'
  }
};

const makeEnvelope = (data: unknown) => ({
  eventId: 'evt-001',
  eventType: 'UserRegistered.v1',
  aggregateId: 'user-abc-123',
  timestamp: new Date().toISOString(),
  data
});

// ---------------------------------------------------------------------------
// Property 1: Bug Condition — UserRegistered.v1 Not Handled
//
// These tests FAIL on unfixed code (no subscription registered for
// 'UserRegistered.v1') and PASS after the fix is applied.
// ---------------------------------------------------------------------------

describe('Property 1: Bug Condition — UserRegistered.v1 Creates User_User Record', () => {
  let handlers: AuthEventHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user_User.upsert.mockResolvedValue({});
    mockedPrisma.user_User.update.mockResolvedValue({});
    mockedPrisma.user_User.findUnique.mockResolvedValue(null);
    mockedPrisma.user_UserIndex.findFirst.mockResolvedValue(null);
    mockedPrisma.user_UserIndex.createMany.mockResolvedValue({ count: 1 });
    handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();
  });

  /**
   * EXPLORATION TEST — run on UNFIXED code first.
   *
   * On unfixed code: getSubscribedHandler('UserRegistered.v1') returns
   * undefined because no subscription is registered → test FAILS.
   *
   * After fix: handler is registered and calls upsert → test PASSES.
   */
  it('registers a subscription for UserRegistered.v1', () => {
    // Bug condition: no subscriber registered for 'UserRegistered.v1'
    // Expected: subscription exists after setupSubscriptions()
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();
  });

  it('calls prisma.user_User.upsert when UserRegistered.v1 is published with a full payload', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    // On unfixed code this is undefined → test fails here (confirms bug)
    expect(handler).toBeDefined();

    await handler!(makeEnvelope(FULL_PAYLOAD));

    expect(mockedPrisma.user_User.upsert).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.user_User.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: FULL_PAYLOAD.userId },
        create: expect.objectContaining({
          id: FULL_PAYLOAD.userId,
          // STORAGE POLICY: email/phone are identifiers, not credentials, and
          // are stored plain + normalized. Lookup goes through the HMAC
          // `user_UserIndex` table, so `piiService.encrypt()` is not applied.
          email: FULL_PAYLOAD.email,
          publicCode: FULL_PAYLOAD.publicCode,
          passwordHash: '',
          role: User_UserRole.BUYER,
          status: User_UserStatus.PENDING_VERIFICATION,
          firstName: FULL_PAYLOAD.profile.firstName,
          lastName: FULL_PAYLOAD.profile.lastName,
          phoneNumber: FULL_PAYLOAD.profile.phoneNumber
        })
      })
    );
  });

  it('sets status to PENDING_VERIFICATION and passwordHash to empty string', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    await handler!(makeEnvelope(FULL_PAYLOAD));

    const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
    expect(call.create.status).toBe(User_UserStatus.PENDING_VERIFICATION);
    expect(call.create.passwordHash).toBe('');
  });

  it('does NOT overwrite passwordHash or security fields in the update clause', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    await handler!(makeEnvelope(FULL_PAYLOAD));

    const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
    // update must not contain passwordHash
    expect(call.update).not.toHaveProperty('passwordHash');
    // update must not contain email (auth-service owns it)
    expect(call.update).not.toHaveProperty('email');
  });

  it('handles missing profile fields gracefully — sets firstName/lastName/phoneNumber to null', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    const payloadNoProfile = {
      userId: 'user-no-profile',
      publicCode: 'PUB-002',
      email: 'bob@example.com',
      role: 'seller'
    };

    await handler!(makeEnvelope(payloadNoProfile));

    expect(mockedPrisma.user_User.upsert).toHaveBeenCalledTimes(1);
    const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
    expect(call.create.firstName).toBeNull();
    expect(call.create.lastName).toBeNull();
    expect(call.create.phoneNumber).toBeNull();
  });

  it('handles empty profile object — sets firstName/lastName/phoneNumber to null', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    const payloadEmptyProfile = {
      userId: 'user-empty-profile',
      publicCode: 'PUB-003',
      email: 'carol@example.com',
      role: 'buyer',
      profile: {}
    };

    await handler!(makeEnvelope(payloadEmptyProfile));

    const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
    expect(call.create.firstName).toBeNull();
    expect(call.create.lastName).toBeNull();
    expect(call.create.phoneNumber).toBeNull();
  });

  it('returns early without calling upsert when userId is missing', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    const payloadNoUserId = {
      publicCode: 'PUB-004',
      email: 'dave@example.com',
      role: 'buyer'
    };

    await handler!(makeEnvelope(payloadNoUserId));

    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('is idempotent — duplicate delivery does not throw and upsert is called twice', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    // Simulate at-least-once delivery
    await handler!(makeEnvelope(FULL_PAYLOAD));
    await handler!(makeEnvelope(FULL_PAYLOAD));

    // upsert semantics: no unique-constraint error, called twice
    expect(mockedPrisma.user_User.upsert).toHaveBeenCalledTimes(2);
  });

  it('maps known roles correctly', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    const roleCases: Array<{ input: string; expected: User_UserRole }> = [
      { input: 'buyer', expected: User_UserRole.BUYER },
      { input: 'seller', expected: User_UserRole.SELLER },
      { input: 'supplier', expected: User_UserRole.SUPPLIER },
      { input: 'courier', expected: User_UserRole.COURIER },
      { input: 'enabler', expected: User_UserRole.ENABLER },
      { input: 'system', expected: User_UserRole.SYSTEM }
    ];

    for (const { input, expected } of roleCases) {
      jest.clearAllMocks();
      mockedPrisma.user_User.upsert.mockResolvedValue({});

      await handler!(
        makeEnvelope({ ...FULL_PAYLOAD, userId: `user-${input}`, role: input })
      );

      const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
      expect(call.create.role).toBe(expected);
    }
  });

  it('defaults to BUYER role for unknown role strings', async () => {
    const handler = getSubscribedHandler('UserRegistered.v1');
    expect(handler).toBeDefined();

    await handler!(
      makeEnvelope({ ...FULL_PAYLOAD, userId: 'user-unknown-role', role: 'unknown_role' })
    );

    const call = mockedPrisma.user_User.upsert.mock.calls[0][0];
    expect(call.create.role).toBe(User_UserRole.BUYER);
  });
});

// ---------------------------------------------------------------------------
// Property 2: Preservation — Existing Auth↔User Sync Flows Unchanged
//
// These tests PASS on both unfixed and fixed code.
// They confirm that adding the UserRegistered.v1 handler does not break
// any of the existing AuthLoginSuccess, AuthLoginFailed, AuthTwoFactor*
// subscriptions.
// ---------------------------------------------------------------------------

describe('Property 2: Preservation — Existing Auth↔User Sync Flows Unchanged', () => {
  let handlers: AuthEventHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.user_User.upsert.mockResolvedValue({});
    mockedPrisma.user_User.update.mockResolvedValue({});
    mockedPrisma.user_User.findUnique.mockResolvedValue(null);
    mockedPrisma.user_UserIndex.findFirst.mockResolvedValue(null);
    mockedPrisma.user_UserIndex.createMany.mockResolvedValue({ count: 1 });
    handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();
  });

  it('still registers subscriptions for all four original event types', () => {
    expect(getSubscribedHandler('AuthLoginSuccess')).toBeDefined();
    expect(getSubscribedHandler('AuthLoginFailed')).toBeDefined();
    expect(getSubscribedHandler('AuthTwoFactorEnabled')).toBeDefined();
    expect(getSubscribedHandler('AuthTwoFactorDisabled')).toBeDefined();
  });

  it('AuthLoginSuccess — still updates lastLoginAt and resets failedLoginAttempts', async () => {
    const handler = getSubscribedHandler('AuthLoginSuccess');
    expect(handler).toBeDefined();

    const lastLoginAt = new Date().toISOString();
    await handler!({
      data: { userId: 'user-login-1', lastLoginAt }
    });

    expect(mockedPrisma.user_User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-login-1' },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockoutUntil: null
        })
      })
    );
    // upsert must NOT have been called
    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('AuthLoginFailed — still increments failedLoginAttempts', async () => {
    const handler = getSubscribedHandler('AuthLoginFailed');
    expect(handler).toBeDefined();

    await handler!({
      data: { userId: 'user-login-2', failedLoginAttempts: 3 }
    });

    expect(mockedPrisma.user_User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-login-2' },
        data: expect.objectContaining({
          failedLoginAttempts: 3
        })
      })
    );
    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('AuthLoginFailed — still sets lockoutUntil and LOCKED status when provided', async () => {
    const handler = getSubscribedHandler('AuthLoginFailed');
    expect(handler).toBeDefined();

    const lockoutUntil = new Date(Date.now() + 3600_000).toISOString();
    await handler!({
      data: { userId: 'user-locked', failedLoginAttempts: 5, lockoutUntil }
    });

    const call = mockedPrisma.user_User.update.mock.calls[0][0];
    expect(call.data.lockoutUntil).toEqual(new Date(lockoutUntil));
    expect(call.data.status).toBe(User_UserStatus.LOCKED);
    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('AuthTwoFactorEnabled — still sets twoFactorEnabled to true', async () => {
    const handler = getSubscribedHandler('AuthTwoFactorEnabled');
    expect(handler).toBeDefined();

    await handler!({ data: { userId: 'user-2fa-1', enabled: true } });

    expect(mockedPrisma.user_User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2fa-1' },
        data: { twoFactorEnabled: true }
      })
    );
    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('AuthTwoFactorDisabled — still sets twoFactorEnabled to false and clears twoFactorSecret', async () => {
    const handler = getSubscribedHandler('AuthTwoFactorDisabled');
    expect(handler).toBeDefined();

    await handler!({ data: { userId: 'user-2fa-2', enabled: false } });

    expect(mockedPrisma.user_User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2fa-2' },
        data: { twoFactorEnabled: false, twoFactorSecret: null }
      })
    );
    expect(mockedPrisma.user_User.upsert).not.toHaveBeenCalled();
  });

  it('UserRegistered.v1 handler does not interfere with AuthLoginSuccess handler', async () => {
    // Publish both events; each handler must only call its own Prisma method
    const loginHandler = getSubscribedHandler('AuthLoginSuccess');
    const registeredHandler = getSubscribedHandler('UserRegistered.v1');

    await loginHandler!({ data: { userId: 'user-x', lastLoginAt: new Date().toISOString() } });
    await registeredHandler!(makeEnvelope(FULL_PAYLOAD));

    // update called once (login), upsert called once (registration)
    expect(mockedPrisma.user_User.update).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.user_User.upsert).toHaveBeenCalledTimes(1);
  });
});
