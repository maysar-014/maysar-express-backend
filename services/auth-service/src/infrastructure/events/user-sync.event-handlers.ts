import { PrismaClient, Auth_UserRole, Auth_UserStatus } from '@prisma/client';
import { EventEnvelope, eventBus } from '@shared/events/eventBus';
import { logger } from '../services/logger.service';

type UserRegisteredPayload = {
  aggregateId?: string;
  email?: string;
  role?: string;
  publicCode?: string;
  phoneNumber?: string;
};

type UserEmailVerifiedPayload = {
  aggregateId?: string;
  email?: string;
};

type UserPhoneVerifiedPayload = {
  aggregateId?: string;
  phoneNumber?: string;
};

type UserRoleChangedPayload = {
  aggregateId?: string;
  newRole?: string;
};

type UserStatusChangedPayload = {
  aggregateId?: string;
  newStatus?: string;
};

type UserProfileUpdatedPayload = {
  aggregateId?: string;
  changes?: string[];
  newValues?: Record<string, unknown>;
};

export class UserSyncEventHandlers {
  constructor(private readonly prisma: PrismaClient) {}

  registerHandlers(): void {
    eventBus.subscribe('UserRegistered', {
      name: 'auth-user-sync-registered',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserRegistered(envelope.data as UserRegisteredPayload);
      }
    });

    eventBus.subscribe('UserEmailVerified', {
      name: 'auth-user-sync-email-verified',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserEmailVerified(envelope.data as UserEmailVerifiedPayload);
      }
    });

    eventBus.subscribe('UserPhoneVerified', {
      name: 'auth-user-sync-phone-verified',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserPhoneVerified(envelope.data as UserPhoneVerifiedPayload);
      }
    });

    eventBus.subscribe('UserRoleChanged', {
      name: 'auth-user-sync-role-changed',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserRoleChanged(envelope.data as UserRoleChangedPayload);
      }
    });

    eventBus.subscribe('UserStatusChanged', {
      name: 'auth-user-sync-status-changed',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserStatusChanged(envelope.data as UserStatusChangedPayload);
      }
    });

    eventBus.subscribe('UserProfileUpdated', {
      name: 'auth-user-sync-profile-updated',
      handler: async (envelope: EventEnvelope) => {
        await this.handleUserProfileUpdated(envelope.data as UserProfileUpdatedPayload);
      }
    });

    logger.info('Auth user sync handlers registered');
  }

  private async handleUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    if (!payload?.aggregateId) return;

    const email = payload.email ? String(payload.email).toLowerCase() : '';
    const role = payload.role ? this.mapRole(payload.role) : Auth_UserRole.BUYER;
    const publicCode = payload.publicCode ?? null;
    const phoneNumber = payload.phoneNumber ?? null;

    try {
      // Use upsert: auth_users row may not exist yet when UserRegistered fires
      await this.prisma.user.upsert({
        where: { id: payload.aggregateId },
        create: {
          id: payload.aggregateId,
          email,
          passwordHash: '', // auth-service owns credentials; placeholder until set
          role,
          status: Auth_UserStatus.PENDING_VERIFICATION,
          ...(publicCode ? { publicCode } : {}),
          ...(phoneNumber ? { phoneNumber } : {})
        },
        update: {
          ...(email ? { email } : {}),
          role,
          status: Auth_UserStatus.PENDING_VERIFICATION,
          ...(publicCode ? { publicCode } : {}),
          // Only update phoneNumber if it's provided in the event — don't overwrite an existing one with null
          ...(phoneNumber ? { phoneNumber } : {})
        }
      });
    } catch (error: any) {
      logger.error('Auth user upsert failed on UserRegistered', { userId: payload.aggregateId, error });
      throw error;
    }
  }

  private async handleUserEmailVerified(payload: UserEmailVerifiedPayload): Promise<void> {
    if (!payload?.aggregateId) return;

    await this.updateAuthUser(payload.aggregateId, {
      isEmailVerified: true,
      ...(payload.email ? { email: String(payload.email).toLowerCase() } : {})
    });
  }

  private async handleUserPhoneVerified(payload: UserPhoneVerifiedPayload): Promise<void> {
    if (!payload?.aggregateId) return;

    await this.updateAuthUser(payload.aggregateId, {
      isPhoneVerified: true,
      ...(payload.phoneNumber ? { phoneNumber: String(payload.phoneNumber) } : {})
    });
  }

  private async handleUserRoleChanged(payload: UserRoleChangedPayload): Promise<void> {
    if (!payload?.aggregateId || !payload.newRole) return;

    await this.updateAuthUser(payload.aggregateId, {
      role: this.mapRole(payload.newRole)
    });
  }

  private async handleUserStatusChanged(payload: UserStatusChangedPayload): Promise<void> {
    if (!payload?.aggregateId || !payload.newStatus) return;

    await this.updateAuthUser(payload.aggregateId, {
      status: this.mapStatus(payload.newStatus)
    });
  }

  private async handleUserProfileUpdated(payload: UserProfileUpdatedPayload): Promise<void> {
    if (!payload?.aggregateId || !payload.newValues || !payload.changes?.length) return;

    const updates: Record<string, unknown> = {};
    if (payload.changes.includes('email') && payload.newValues.email) {
      updates.email = String(payload.newValues.email).toLowerCase();
    }
    if (payload.changes.includes('phoneNumber') && payload.newValues.phoneNumber) {
      updates.phoneNumber = String(payload.newValues.phoneNumber);
    }

    if (Object.keys(updates).length > 0) {
      await this.updateAuthUser(payload.aggregateId, updates);
    }
  }

  private async updateAuthUser(userId: string, data: Record<string, unknown>): Promise<void> {
    const updateData = this.stripUndefined(data);
    if (Object.keys(updateData).length === 0) return;

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        logger.warn('Auth user not found for sync', { userId, updateKeys: Object.keys(updateData) });
        return;
      }
      logger.error('Auth user sync failed', { userId, error });
      throw error;
    }
  }

  private mapRole(role: string): Auth_UserRole {
    switch (String(role).toLowerCase()) {
      case 'buyer':
        return Auth_UserRole.BUYER;
      case 'seller':
        return Auth_UserRole.SELLER;
      case 'supplier':
        return Auth_UserRole.SUPPLIER;
      case 'courier':
        return Auth_UserRole.COURIER;
      case 'enabler':
        return Auth_UserRole.ENABLER;
      case 'system':
        return Auth_UserRole.SYSTEM;
      default:
        return Auth_UserRole.BUYER;
    }
  }

  private mapStatus(status: string): Auth_UserStatus {
    switch (String(status).toLowerCase()) {
      case 'active':
        return Auth_UserStatus.ACTIVE;
      case 'suspended':
        return Auth_UserStatus.SUSPENDED;
      case 'deactivated':
        return Auth_UserStatus.DEACTIVATED;
      case 'locked':
        return Auth_UserStatus.LOCKED;
      case 'pending_verification':
        return Auth_UserStatus.PENDING_VERIFICATION;
      default:
        return Auth_UserStatus.PENDING_VERIFICATION;
    }
  }

  private stripUndefined(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  }
}
