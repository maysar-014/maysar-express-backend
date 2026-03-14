import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { User_UserStatus } from '@prisma/client';
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
  }
}
