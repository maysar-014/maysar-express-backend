import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { User_UserRole, User_UserStatus } from '@prisma/client';
import { prisma } from '../database/prisma-client';
import { logger } from '../services/logger.service';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

interface AuthLoginSuccessPayload {
  userId?: string;
  lastLoginAt?: string;
}

interface AuthLoginFailedPayload {
  userId?: string;
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  reason?: string;
}

interface AuthTwoFactorPayload {
  userId?: string;
  enabled?: boolean;
}

interface AuthUserRegisteredPayload {
  userId?: string;
  publicCode?: string;
  email?: string;
  role?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asLoginSuccess = (value: unknown): AuthLoginSuccessPayload => {
  const parsed = asRecord(value);
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    lastLoginAt: typeof parsed.lastLoginAt === 'string' ? parsed.lastLoginAt : undefined
  };
};

const asLoginFailed = (value: unknown): AuthLoginFailedPayload => {
  const parsed = asRecord(value);
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    failedLoginAttempts: typeof parsed.failedLoginAttempts === 'number' ? parsed.failedLoginAttempts : undefined,
    lockoutUntil: typeof parsed.lockoutUntil === 'string' ? parsed.lockoutUntil : null,
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
  };
};

const asTwoFactor = (value: unknown): AuthTwoFactorPayload => {
  const parsed = asRecord(value);
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined
  };
};

const asUserRegistered = (value: unknown): AuthUserRegisteredPayload => {
  const parsed = asRecord(value);
  const rawProfile = parsed.profile;
  const profile =
    typeof rawProfile === 'object' && rawProfile !== null
      ? (rawProfile as Record<string, unknown>)
      : {};
  // phoneNumber may come from profile.phoneNumber OR from a top-level phoneNumber field
  const topLevelPhone = typeof parsed.phoneNumber === 'string' ? parsed.phoneNumber : undefined;
  const profilePhone = typeof profile.phoneNumber === 'string' ? profile.phoneNumber : undefined;
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    publicCode: typeof parsed.publicCode === 'string' ? parsed.publicCode : undefined,
    email: typeof parsed.email === 'string' ? parsed.email : undefined,
    role: typeof parsed.role === 'string' ? parsed.role : undefined,
    profile: {
      firstName: typeof profile.firstName === 'string' ? profile.firstName : undefined,
      lastName: typeof profile.lastName === 'string' ? profile.lastName : undefined,
      phoneNumber: topLevelPhone ?? profilePhone
    }
  };
};

const mapRole = (role: string | undefined): User_UserRole => {
  switch (String(role ?? '').toLowerCase()) {
    case 'buyer':    return User_UserRole.BUYER;
    case 'seller':   return User_UserRole.SELLER;
    case 'supplier': return User_UserRole.SUPPLIER;
    case 'courier':  return User_UserRole.COURIER;
    case 'enabler':  return User_UserRole.ENABLER;
    case 'system':   return User_UserRole.SYSTEM;
    case 'admin':    return User_UserRole.SYSTEM;  // 'admin' is an alias for SYSTEM
    default:         return User_UserRole.BUYER;
  }
};

export class AuthEventHandlers {
  /**
   * @param piiService - Used to encrypt PII fields (email, phone) before storing
   *   in `user_User` and to create hashed lookup entries in `user_UserIndex`.
   *   Every write to `user_User.email` MUST go through `piiService.encrypt()`;
   *   every `user_UserIndex` entry MUST use `piiService.hash()` as the value.
   */
  constructor(private readonly piiService: PiiEncryptionService) {}

  public setupSubscriptions(): void {
    logger.info('Setting up Auth -> User sync subscriptions');

    // ── AuthLoginSuccess ──────────────────────────────────────────────────────
    eventBus.subscribe('AuthLoginSuccess', async (envelope: EventEnvelope) => {
      const payload = asLoginSuccess(envelope.data);
      if (!payload.userId) return;

      await prisma.user_User.update({
        where: { id: payload.userId },
        data: {
          lastLoginAt: payload.lastLoginAt ? new Date(payload.lastLoginAt) : new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null
        }
      });
    });

    // ── AuthLoginFailed ───────────────────────────────────────────────────────
    eventBus.subscribe('AuthLoginFailed', async (envelope: EventEnvelope) => {
      const payload = asLoginFailed(envelope.data);
      if (!payload.userId) return;

      const updateData: Record<string, unknown> = {};
      if (payload.failedLoginAttempts !== undefined) {
        updateData.failedLoginAttempts = payload.failedLoginAttempts;
      } else {
        updateData.failedLoginAttempts = { increment: 1 };
      }

      if (payload.lockoutUntil) {
        updateData.lockoutUntil = new Date(payload.lockoutUntil);
        updateData.status = User_UserStatus.LOCKED;
      }

      await prisma.user_User.update({
        where: { id: payload.userId },
        data: updateData
      });
    });

    // ── AuthTwoFactorEnabled ──────────────────────────────────────────────────
    eventBus.subscribe('AuthTwoFactorEnabled', async (envelope: EventEnvelope) => {
      const payload = asTwoFactor(envelope.data);
      if (!payload.userId) return;

      await prisma.user_User.update({
        where: { id: payload.userId },
        data: { twoFactorEnabled: true }
      });
    });

    // ── AuthTwoFactorDisabled ─────────────────────────────────────────────────
    eventBus.subscribe('AuthTwoFactorDisabled', async (envelope: EventEnvelope) => {
      const payload = asTwoFactor(envelope.data);
      if (!payload.userId) return;

      await prisma.user_User.update({
        where: { id: payload.userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      });
    });

    // ── UserRegistered.v1 ─────────────────────────────────────────────────────
    // FIX: email and phoneNumber MUST be PII-encrypted before storage.
    // The `user_User.email` column stores AES-256-GCM ciphertext.
    // The `user_UserIndex` table stores HMAC-SHA256 hashes for lookups.
    // Previously this handler wrote plaintext email directly, which violated
    // the PII contract and produced ghost rows invisible to findByEmail().
    eventBus.subscribe('UserRegistered.v1', async (envelope: EventEnvelope) => {
      const payload = asUserRegistered(envelope.data);
      if (!payload.userId) return;

      const { firstName = null, lastName = null, phoneNumber = null } = payload.profile ?? {};

      const rawEmail = payload.email ?? '';
      const encryptedEmail = rawEmail ? this.piiService.encrypt(rawEmail) : '';
      const emailHash = rawEmail ? this.piiService.hash(rawEmail) : '';

      const encryptedPhone = phoneNumber ? this.piiService.encrypt(phoneNumber) : null;
      const phoneHash = phoneNumber ? this.piiService.hash(phoneNumber) : null;

      // ── FIX: read existing record so we can protect ACTIVE status ──────────
      // Also check by email hash in case the row was created with a different ID
      // (e.g., by userServiceClient.createUser before this event fired)
      let existing = await prisma.user_User.findUnique({
        where: { id: payload.userId },
        select: { id: true, status: true }
      });

      // If not found by ID, try to find by email hash (deduplication)
      if (!existing && emailHash) {
        const emailIndex = await prisma.user_UserIndex.findFirst({
          where: { indexType: 'email', value: emailHash },
          select: { userId: true }
        });
        if (emailIndex) {
          existing = await prisma.user_User.findUnique({
            where: { id: emailIndex.userId },
            select: { id: true, status: true }
          });
        }
      }

      const statusIsActive = existing?.status === User_UserStatus.ACTIVE;
      const existingId = existing?.id ?? payload.userId;
      // ────────────────────────────────────────────────────────────────────────

      await prisma.user_User.upsert({
        where: { id: existingId },
        create: {
          id: existingId,
          email: encryptedEmail,        // ← PII-encrypted ✓
          publicCode: payload.publicCode ?? null,
          passwordHash: '',
          role: mapRole(payload.role),
          status: User_UserStatus.PENDING_VERIFICATION,
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          phoneNumber: encryptedPhone   // ← PII-encrypted (or null) ✓
        },
        update: {
          // Only update non-destructive fields on existing records.
          // Never overwrite an existing encrypted email — the create path
          // already set it correctly via PrismaUserRepository.create().
          publicCode: payload.publicCode ?? null,
          // FIX 1: only update role when the payload carries a role value —
          // when absent, leave existing role untouched (prevents SYSTEM → BUYER demotion)
          ...(payload.role ? { role: mapRole(payload.role) } : {}),
          // FIX 2: never downgrade status from ACTIVE — only write PENDING_VERIFICATION
          // when the existing record is NOT already ACTIVE
          ...(statusIsActive ? {} : { status: User_UserStatus.PENDING_VERIFICATION })
        }
      });

      // Create index entries so findByEmail() can resolve this user.
      // Only insert if the email index doesn't already exist (idempotent).
      if (emailHash) {
        const existingEmailIndex = await prisma.user_UserIndex.findFirst({
          where: { userId: payload.userId, indexType: 'email' }
        });

        if (!existingEmailIndex) {
          const indexData: Array<{ userId: string; indexType: string; value: string }> = [
            { userId: payload.userId, indexType: 'email', value: emailHash }
          ];
          if (phoneHash) {
            indexData.push({ userId: payload.userId, indexType: 'phone', value: phoneHash });
          }
          await prisma.user_UserIndex.createMany({ data: indexData });
          logger.debug('user_UserIndex entries created via UserRegistered.v1 handler', {
            userId: payload.userId,
            hasPhone: !!phoneHash
          });
        }
      }
    });
  }
}
