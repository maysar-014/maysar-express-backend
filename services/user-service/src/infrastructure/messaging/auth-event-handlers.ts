import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { User_UserRole, User_UserStatus } from '@prisma/client';
import { prisma } from '../database/prisma-client';
import { logger } from '../services/logger.service';

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
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    publicCode: typeof parsed.publicCode === 'string' ? parsed.publicCode : undefined,
    email: typeof parsed.email === 'string' ? parsed.email : undefined,
    role: typeof parsed.role === 'string' ? parsed.role : undefined,
    profile: {
      firstName: typeof profile.firstName === 'string' ? profile.firstName : undefined,
      lastName: typeof profile.lastName === 'string' ? profile.lastName : undefined,
      phoneNumber: typeof profile.phoneNumber === 'string' ? profile.phoneNumber : undefined
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
    default:         return User_UserRole.BUYER;
  }
};

export class AuthEventHandlers {
  public setupSubscriptions(): void {
    logger.info('Setting up Auth -> User sync subscriptions');

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

    eventBus.subscribe('AuthTwoFactorEnabled', async (envelope: EventEnvelope) => {
      const payload = asTwoFactor(envelope.data);
      if (!payload.userId) return;

      await prisma.user_User.update({
        where: { id: payload.userId },
        data: {
          twoFactorEnabled: true
        }
      });
    });

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

    eventBus.subscribe('UserRegistered.v1', async (envelope: EventEnvelope) => {
      const payload = asUserRegistered(envelope.data);
      if (!payload.userId) return;

      const { firstName = null, lastName = null, phoneNumber = null } = payload.profile ?? {};

      await prisma.user_User.upsert({
        where: { id: payload.userId },
        create: {
          id: payload.userId,
          email: payload.email ?? '',
          publicCode: payload.publicCode ?? null,
          passwordHash: '',
          role: mapRole(payload.role),
          status: User_UserStatus.PENDING_VERIFICATION,
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          phoneNumber: phoneNumber ?? null
        },
        update: {
          publicCode: payload.publicCode ?? null,
          role: mapRole(payload.role),
          status: User_UserStatus.PENDING_VERIFICATION
        }
      });
    });
  }
}
