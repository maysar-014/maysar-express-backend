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
      upsert: jest.fn(),
      findUnique: jest.fn()
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
    ACTIVE: 'ACTIVE',
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
    (prisma.user_User.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('registers 5 auth-to-user subscriptions', () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    expect(mockSubscribe).toHaveBeenCalledTimes(5);
    expect(mockLoggerInfo).toHaveBeenCalledWith('Setting up Auth -> User sync subscriptions');
  });

  // ── UserRegistered.v1 — PII fix tests ──────────────────────────────────────

  it('[5.1] UserRegistered.v1: stores the PLAIN normalized email, never ciphertext', async () => {
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
    // STORAGE POLICY: email is an identifier, not a credential, and is stored
    // plain + normalized. The deterministic HMAC hash in `user_UserIndex` is
    // the lookup mechanism; `piiService.encrypt()` must never be applied here.
    expect(upsertCall.create.email).toBe('test@example.com');
    // Regression guard: the value must never carry the cipher output, which is
    // `iv:authTag:ciphertext` hex - it contains no '@'.
    expect(upsertCall.create.email).toContain('@');
    expect(String(upsertCall.create.email)).not.toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:/i);
  });

  it('[5.1b] UserRegistered.v1: stores the PLAIN normalized phone, never ciphertext', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: {
        userId: 'user-pii-2',
        publicCode: 'USR-101',
        email: 'test@example.com',
        role: 'buyer',
        profile: { phoneNumber: '+255700000001' }
      }
    });

    const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.phoneNumber).toBe('+255700000001');
    expect(String(upsertCall.create.phoneNumber)).not.toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:/i);
  });

  it('[5.1c] UserRegistered.v1: lowercases the email so uniqueness is case-insensitive', async () => {
    const handlers = new AuthEventHandlers(makePiiService());
    handlers.setupSubscriptions();

    const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

    await userRegistered({
      data: {
        userId: 'user-pii-3',
        publicCode: 'USR-102',
        email: '  MiXeD@Example.COM ',
        role: 'buyer',
        profile: {}
      }
    });

    const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.email).toBe('mixed@example.com');
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

  // ── Preservation (Property 2) ─────────────────────────────────────────────
  // These tests verify that non-buggy paths remain unchanged after the fix.
  // All tests should PASS on unfixed code (the create branch and other handlers
  // are completely unaffected by the bug in the update clause).
  // Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

  describe('Preservation (Property 2)', () => {
    /**
     * C.3 — Status on new record (create branch)
     *
     * findUnique returns null (no existing record) → upsert takes the create path.
     * The create branch must always set status = PENDING_VERIFICATION.
     */
    it('C.3 — create.status = PENDING_VERIFICATION when no existing record', async () => {
      // Arrange: no existing record
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue(null);

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await userRegistered({
        data: {
          userId: 'user-new-1',
          publicCode: 'USR-500',
          email: 'newuser@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.status).toBe('PENDING_VERIFICATION');
    });

    /**
     * C.7 — Role default BUYER on create when payload.role absent
     *
     * findUnique returns null; event has no role field.
     * The create branch must default role to BUYER.
     */
    it('C.7 — create.role = BUYER when payload.role absent and no existing record', async () => {
      // Arrange: no existing record
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue(null);

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver event with no role field
      await userRegistered({
        data: {
          userId: 'user-new-2',
          publicCode: 'USR-501',
          email: 'newuser2@example.com',
          // role intentionally omitted
          profile: {}
        }
      });

      // Assert: create branch defaults to BUYER
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.role).toBe('BUYER');
    });

    /**
     * C.8 — Create branch identity fields
     *
     * findUnique returns null; event has email = 'test@example.com'.
     * The create branch must store the plain normalized email and an empty
     * passwordHash (the credential itself is never carried in the event).
     */
    it('C.8 — create.email is plain/normalized and create.passwordHash is empty string for new record', async () => {
      // Arrange: no existing record
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue(null);

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await userRegistered({
        data: {
          userId: 'user-new-3',
          publicCode: 'USR-502',
          email: 'test@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert: identity stored plain (never ciphertext) and passwordHash empty
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.email).toBe('test@example.com');
      expect(String(upsertCall.create.email)).not.toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:/i);
      expect(upsertCall.create.passwordHash).toBe('');
    });

    /**
     * C.9 — AuthLoginSuccess unchanged
     *
     * Deliver AuthLoginSuccess; assert user_User.update is called with
     * failedLoginAttempts: 0 and lockoutUntil: null.
     */
    it('C.9 — AuthLoginSuccess: update called with failedLoginAttempts=0 and lockoutUntil=null', async () => {
      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [loginSuccess, loginFailed, twoFactorEnabled, twoFactorDisabled, userRegistered] =
        mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await loginSuccess({
        data: { userId: 'user-login-1', lastLoginAt: '2026-05-01T10:00:00.000Z' }
      });

      // Assert
      expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-login-1' },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockoutUntil: null
          })
        })
      );
    });

    /**
     * C.10 — AuthLoginFailed unchanged
     *
     * Deliver AuthLoginFailed with failedLoginAttempts: 3; assert user_User.update
     * is called with failedLoginAttempts: 3.
     */
    it('C.10 — AuthLoginFailed: update called with failedLoginAttempts=3', async () => {
      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [loginSuccess, loginFailed, twoFactorEnabled, twoFactorDisabled, userRegistered] =
        mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await loginFailed({
        data: {
          userId: 'user-login-2',
          failedLoginAttempts: 3
        }
      });

      // Assert
      expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-login-2' },
          data: expect.objectContaining({
            failedLoginAttempts: 3
          })
        })
      );
    });

    /**
     * C.11 — AuthTwoFactorEnabled unchanged
     *
     * Deliver AuthTwoFactorEnabled; assert user_User.update is called with
     * twoFactorEnabled: true.
     */
    it('C.11 — AuthTwoFactorEnabled: update called with twoFactorEnabled=true', async () => {
      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [loginSuccess, loginFailed, twoFactorEnabled, twoFactorDisabled, userRegistered] =
        mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await twoFactorEnabled({
        data: { userId: 'user-2fa-1', enabled: true }
      });

      // Assert
      expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-2fa-1' },
          data: { twoFactorEnabled: true }
        })
      );
    });

    /**
     * C.12 — AuthTwoFactorDisabled unchanged
     *
     * Deliver AuthTwoFactorDisabled; assert user_User.update is called with
     * twoFactorEnabled: false and twoFactorSecret: null.
     */
    it('C.12 — AuthTwoFactorDisabled: update called with twoFactorEnabled=false and twoFactorSecret=null', async () => {
      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [loginSuccess, loginFailed, twoFactorEnabled, twoFactorDisabled, userRegistered] =
        mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await twoFactorDisabled({
        data: { userId: 'user-2fa-2', enabled: false }
      });

      // Assert
      expect(prisma.user_User.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-2fa-2' },
          data: { twoFactorEnabled: false, twoFactorSecret: null }
        })
      );
    });
  });

  // ── Fix Checking (C.1–C.6) ────────────────────────────────────────────────
  // These tests verify that the fix correctly guards status and role in the
  // update clause of the UserRegistered.v1 handler.
  // Validates: Requirements 2.1, 2.2, 2.3, 2.4

  describe('Fix Checking (C.1–C.6)', () => {
    /**
     * C.1 — Status NOT downgraded when existing is ACTIVE
     *
     * findUnique returns { status: 'ACTIVE' }; deliver UserRegistered.v1.
     * The update clause MUST NOT contain status: 'PENDING_VERIFICATION'.
     */
    it('C.1 — update.status is NOT PENDING_VERIFICATION when existing status is ACTIVE', async () => {
      // Arrange: existing record is ACTIVE
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await userRegistered({
        data: {
          userId: 'user-c1-1',
          publicCode: 'USR-C1',
          email: 'active@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert: update must NOT contain status PENDING_VERIFICATION
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      const update = upsertCall.update;
      expect(update.status).not.toBe('PENDING_VERIFICATION');
      // status should be absent (undefined) in the update object
      expect(update).not.toHaveProperty('status', 'PENDING_VERIFICATION');
    });

    /**
     * C.2 — Status written when existing is PENDING_VERIFICATION
     *
     * findUnique returns { status: 'PENDING_VERIFICATION' }; deliver event.
     * The update clause MUST contain status: 'PENDING_VERIFICATION'.
     */
    it('C.2 — update.status = PENDING_VERIFICATION when existing status is PENDING_VERIFICATION', async () => {
      // Arrange: existing record is PENDING_VERIFICATION
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'PENDING_VERIFICATION' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act
      await userRegistered({
        data: {
          userId: 'user-c2-1',
          publicCode: 'USR-C2',
          email: 'pending@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert: update must write PENDING_VERIFICATION (record isn't ACTIVE, so safe to write)
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.status).toBe('PENDING_VERIFICATION');
    });

    /**
     * C.4 — Role preserved when payload.role absent
     *
     * findUnique returns { status: 'ACTIVE' }; deliver event without role field.
     * The update object MUST NOT have a 'role' key.
     */
    it('C.4 — update does NOT have a role key when payload.role is absent', async () => {
      // Arrange: existing record is ACTIVE
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver event with no role field
      await userRegistered({
        data: {
          userId: 'user-c4-1',
          publicCode: 'USR-C4',
          email: 'norole@example.com',
          // role intentionally omitted
          profile: {}
        }
      });

      // Assert: role key must be absent from update
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      const update = upsertCall.update;
      expect(update).not.toHaveProperty('role');
    });

    /**
     * C.5 — Role = SYSTEM when payload.role = 'system'
     *
     * findUnique returns { status: 'ACTIVE' }; deliver event with role: 'system'.
     * The update clause MUST set role = 'SYSTEM'.
     */
    it("C.5 — update.role = 'SYSTEM' when payload.role = 'system'", async () => {
      // Arrange: existing record is ACTIVE
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver event with role = 'system'
      await userRegistered({
        data: {
          userId: 'user-c5-1',
          publicCode: 'USR-C5',
          email: 'system@example.com',
          role: 'system',
          profile: {}
        }
      });

      // Assert: update.role must be SYSTEM
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.role).toBe('SYSTEM');
    });

    /**
     * C.6 — Role = BUYER when payload.role = 'buyer'
     *
     * findUnique returns { status: 'ACTIVE' }; deliver event with role: 'buyer'.
     * The update clause MUST set role = 'BUYER'.
     */
    it("C.6 — update.role = 'BUYER' when payload.role = 'buyer'", async () => {
      // Arrange: existing record is ACTIVE
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver event with role = 'buyer'
      await userRegistered({
        data: {
          userId: 'user-c6-1',
          publicCode: 'USR-C6',
          email: 'buyer@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert: update.role must be BUYER
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.update.role).toBe('BUYER');
    });
  });

  // ── Bug Condition Exploration (Property 1) ─────────────────────────────────
  // These tests are EXPECTED TO FAIL on unfixed code.
  // Failure confirms the bugs exist: the update clause unconditionally
  // overwrites status and role regardless of the existing record state.
  // Validates: Requirements 1.1, 1.2, 1.3

  describe('Bug Condition Exploration (Property 1)', () => {
    /**
     * Case A — Status downgrade
     *
     * Existing record has status = ACTIVE.
     * Deliver UserRegistered.v1 with a valid payload.
     * The update clause MUST NOT write status = PENDING_VERIFICATION.
     *
     * On UNFIXED code: upsert.update.status = 'PENDING_VERIFICATION' → assertion FAILS (confirms bug).
     */
    it('Case A — update.status MUST NOT be PENDING_VERIFICATION when existing status is ACTIVE', async () => {
      // Arrange: simulate an existing ACTIVE record
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver UserRegistered.v1 with a valid payload
      await userRegistered({
        data: {
          userId: 'user-active-1',
          publicCode: 'USR-200',
          email: 'buyer@example.com',
          role: 'buyer',
          profile: {}
        }
      });

      // Assert: the update clause must NOT have written PENDING_VERIFICATION
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      const update = upsertCall.update;
      expect(update.status).not.toBe('PENDING_VERIFICATION');
    });

    /**
     * Case B — Role clobber (absent role)
     *
     * Existing record has role = SYSTEM.
     * Deliver UserRegistered.v1 with NO role field in payload.
     * The update clause MUST NOT write role = BUYER (the mapRole(undefined) default).
     *
     * On UNFIXED code: mapRole(undefined) returns BUYER → upsert.update.role = 'BUYER' → assertion FAILS (confirms bug).
     */
    it('Case B — update.role MUST NOT be BUYER when existing role is SYSTEM and payload.role is absent', async () => {
      // Arrange: simulate an existing SYSTEM-role record
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE', role: 'SYSTEM' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver UserRegistered.v1 with NO role field (simulates absent/dropped role)
      await userRegistered({
        data: {
          userId: 'user-system-1',
          publicCode: 'USR-300',
          email: 'admin@example.com',
          // role intentionally omitted
          profile: {}
        }
      });

      // Assert: the update clause must NOT have written BUYER
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      const update = upsertCall.update;
      expect(update.role).not.toBe('BUYER');
    });

    /**
     * Case C — Combined state (status + role corruption in a single counterexample)
     *
     * Existing record has status = ACTIVE and role = SYSTEM.
     * Deliver UserRegistered.v1 with no role field.
     * Both corruptions must be absent in the update clause.
     *
     * On UNFIXED code: both update.status = 'PENDING_VERIFICATION' and update.role = 'BUYER' → both assertions FAIL.
     */
    it('Case C — Combined: update MUST NOT downgrade status to PENDING_VERIFICATION AND MUST NOT clobber role to BUYER', async () => {
      // Arrange: existing record is ACTIVE with SYSTEM role
      (prisma.user_User.findUnique as jest.Mock).mockResolvedValue({ status: 'ACTIVE', role: 'SYSTEM' });

      const handlers = new AuthEventHandlers(makePiiService());
      handlers.setupSubscriptions();

      const [, , , , userRegistered] = mockSubscribe.mock.calls.map(c => c[1]);

      // Act: deliver UserRegistered.v1 with no role (absent field — maps to undefined)
      await userRegistered({
        data: {
          userId: 'user-combined-1',
          publicCode: 'USR-400',
          email: 'admin-buyer@example.com',
          // role intentionally omitted
          profile: {}
        }
      });

      // Assert: neither corruption must appear in the update argument
      const upsertCall = (prisma.user_User.upsert as jest.Mock).mock.calls[0][0];
      const update = upsertCall.update;
      expect(update.status).not.toBe('PENDING_VERIFICATION');
      expect(update.role).not.toBe('BUYER');
    });
  });
});
